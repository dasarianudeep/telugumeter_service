const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const url = require('url');

const sites = ['gulte', 'greatandhra', 'tupaki', 'idlebrain',
                'cinejosh', '123telugu', 'telugu360', 'telugumirchi', 'chitramala'];

const getOnlyDomainName = hostname => {
    const splitHost = hostname.split('.');
    if (splitHost.length === 3) {
        return splitHost[1];
    } else if (splitHost.length === 2 || splitHost.length === 2) {
        return splitHost[0];
    }
}
const getMovies = async () => {
    let $, response = { movies: [] };
    try {
        const pageResponse = await axios.get('http://www.ratingdada.com/1/telugu-movie-reviews-ratings');
        const pageResponseData = pageResponse.data;
        $ = cheerio.load(pageResponseData);
        let moviesLinks = $('#titlesdiv .grid_3 > a');
        const getReviewPromises = moviesLinks.map(i => getReviews(moviesLinks.eq(i))).get();
        response.createdOn = new Date().toLocaleString();
        response.movies = await Promise.all(getReviewPromises);
        fs.writeFileSync(path.join(__dirname,'../../static/movies.json'), JSON.stringify(response, null, '\t'));
    } catch (err) {
        console.log(err);
        return err;
    }
}

const getReviews =  (movieLink) => {
    return new Promise(async (resolve, reject) => {
        try {
            let $;
            const movie = {
                name: '',
                releaseDate: '',
                reviews: []
            };
            movie.name = movieLink.attr('title').toUpperCase();
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
    try {
        await getMovies();
        const moviesJson = require('../../static/movies');
        res.json(moviesJson);
    } catch (err) {
        res.json({ response: '', error: err });
    }
}
