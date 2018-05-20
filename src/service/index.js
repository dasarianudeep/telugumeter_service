const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const url = require('url');
const _ = require('lodash');

const sites = ['gulte', 'greatandhra', 'tupaki', 'idlebrain', 'iqlikmovies',
                'cinejosh', '123telugu', 'telugu360', 'telugumirchi', 'chitramala'];

const response = {
    movies: {
        telugu: [],
        english: []
    }
};

const getOnlyDomainName = hostname => {
    const splitHost = hostname.split('.');
    if (splitHost.length === 3) {
        return splitHost[1];
    } else if (splitHost.length === 2 || splitHost.length === 2) {
        return splitHost[0];
    }
}
const getTeluguMovieReviews = async () => {
    let $;
    try {
        const pageResponse = await axios.get('http://www.ratingdada.com/1/telugu-movie-reviews-ratings');
        const pageResponseData = pageResponse.data;
        $ = cheerio.load(pageResponseData);
        let moviesLinks = $('#titlesdiv .grid_3 > a');
        const getReviewPromises = moviesLinks.map(i => getTeluguReviews(moviesLinks.eq(i))).get();
        response.createdOn = new Date().toLocaleString();
        response.movies.telugu = await Promise.all(getReviewPromises);
    } catch (err) {
        console.log(err);
        response.error = `Failed to get telugu movie reviews - ${err}`;
        return err;
    }
}

const getEnglishMovieReviews = async () => {
    let $;
    try {
        const pageResponse = await axios.get('https://www.imdb.com/showtimes/');
        const pageResponseData = pageResponse.data;
        $ = cheerio.load(pageResponseData);
        const movieLinks = $(`div.list_item[itemtype='http://schema.org/Movie']`).slice(0, 100);
        movieLinks.each(function(i, link) {
            const movieReview = {};
            movieReview.posterUrl = $(link).find(`img[itemprop='image']`).attr('src');
            movieReview.name = $(link).find(`span[itemprop='name'] a[itemprop='url']`).text().includes('(') ?
                $(link).find(`span[itemprop='name'] a[itemprop='url']`).text().split('(')[0].trim():
                $(link).find(`span[itemprop='name'] a[itemprop='url']`).text();
            movieReview.imdbRating = $(link).find(`span[itemprop='aggregateRating'] [itemprop='ratingValue']`).text().trim() || 'N/A';
            movieReview.metascore = $(link).find(`span[itemprop='aggregateRating'] .metascore`).text().trim() || 'N/A';
            response.movies.english.push(movieReview);
        })
        response.movies.english = _.uniqWith(response.movies.english.filter(movie => movie.name !== ''), _.isEqual);
    } catch (err) {
        console.log(err);
        response.error = `Failed to get english movie reviews - ${err}`;
        return err;
    }
}

const getTeluguReviews =  (movieLink) => {
    return new Promise(async (resolve, reject) => {
        try {
            let $;
            const movie = {
                name: '',
                releaseDate: '',
                reviews: []
            };
            movie.name = movieLink.attr('title').toUpperCase();
            movie.movieAvatar = movieLink.find('img').attr('src');
            movie.releaseDate = movieLink.siblings('span').text().split(':')[1].trim();
            const pageResponse = await axios.get(movieLink.attr('href'));
            const pageResponseData = pageResponse.data;
            $ = cheerio.load(pageResponseData);
            const reviewDivs = $('.row.divborder');
            const movieReviews = reviewDivs.map(i => {
                if (i === reviewDivs.length - 1) {
                    return null;
                }
                return {
                    siteUrl: reviewDivs.eq(i).find('a').first().attr('href'),
                    sitelogo: reviewDivs.eq(i).find('a > img').attr('src'),
                    rating: reviewDivs.eq(i).find('a').next().text(),
                    verdict: reviewDivs.eq(i).find('.grid_7').text(),
                }
            }).get();
            movie.reviews = movieReviews.filter(review => sites.some(site => review.siteUrl.includes(site))).map(review => {
                if (!(review.siteUrl.includes('http://') || review.siteUrl.includes('https://'))) {
                    review.siteUrl = `http://${review.siteUrl}`;
                }
                return Object.assign({}, review, { siteName: getOnlyDomainName(url.parse(review.siteUrl).hostname).toUpperCase() });
            });

            resolve(movie);
        } catch (err) {
            reject(err);
        }
    })

}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (fs.existsSync(path.join(__dirname,'../../static/movies.json'))) {
        fs.unlinkSync(path.join(__dirname,'../../static/movies.json'));
    }
    let moviesJson = {};
    try {
        await getTeluguMovieReviews();
        fs.writeFileSync(path.join(__dirname,'../../static/movies.json'), JSON.stringify(response, null, '\t'));
        moviesJson = require('../../static/movies');
        res.json(moviesJson);
    } catch (err) {
        res.status(500).json(response);
    }
}
