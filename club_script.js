const fetch = require("isomorphic-fetch");
const puppeteer = require('puppeteer');
const Ora = require('ora');
const utils = require('./utils/utils');
const arg = require('arg');

const args = arg({
    // Types
    '--RAClubId': String,
    '--clubName': String,
    '--apiDiscogs': String,
    '--year': String,
});

const spinner = new Ora();

// if (!args['--RAClubId'] || !args['--clubName'] || !args['--apiDiscogs'] || !args['--year']) {
//     console.log('All options are mandatory --RAClubId --clubName --apiDiscogs --year');
//     process.exit(1);
//     return;
// }

// const contents = fs.readFileSync('DATA', 'utf8');
// console.log(contents);

const RAClubId = args['--RAClubId'];
const clubName = args['--clubName'];
const year = args['--year'];
const apiDiscogs = args['--apiDiscogs'];

console.log('apiDiscogs', apiDiscogs);
console.log('year', year);
const amsterdam = [
    {club: 'Undrgrnd', id: '118695'},
    {club: 'De_School', id: '112491'},
    {club: 'Claire', id: '124039'},
    {club: 'Oosterbar', id: '126218'},
    {club: 'Garage_Noord', id: '137474'},
    {club: 'Radio_Radio', id: '156530'},
    {club: 'Club_NL', id: '2839'},
    {club: 'Disco_Dolly', id: '87805'},
    {club: 'JACK', id: '138971'},
    {club: 'Thuishaven', id: '109027'},
    {club: 'Melkweg', id: '2693'},
    {club: 'BRET', id: '108549'},
    {club: 'Sugar_Factory', id: '2690'},
    {club: 'noorderling', id: '151044'},
    {club: 'Canvas', id: '12591'},
    {club: 'John_Doe', id: '109140'},
    {club: 'RADION', id: '91202'},
    {club: 'OT301', id: '13028'}
]

async function fetchYearEventsPage(page) {
    await page.exposeFunction('myFormatDate', utils.myFormatDate);
    const finalEventsList = await page.evaluate(() => {
        let eventsList = [];
        let eventsListElement = document.querySelector('.list');
        if (eventsListElement) {
            let eventsElements = eventsListElement.querySelectorAll('li');
            if (eventsElements.length > 0) {
                for (let i = 0; i < eventsElements.length; i++) {
                    // console.log(eventsElements[i]);
                    let eventTitle = eventsElements[i].querySelector('h1').textContent;
                    let eventId = eventsElements[i].querySelector('h1').parentNode.href;
                    // console.log(eventId);
                    let eventDate = myFormatDate(eventsElements[i].querySelector('.date').textContent);
                    // console.log(eventDate);
                    let eventPopularity = 0;
                    if (eventsElements[i].querySelector('.counter')) {
                        eventPopularity = eventsElements[i].querySelector('.counter').querySelector('span').textContent;
                    }
                    // console.log(eventPopularity);
                    eventsList.push({ eventTitle: eventTitle, eventId: eventId, eventDate: eventDate, eventPopularity: eventPopularity });
                }
            }
        }
        // eventsList = eventsList.filter((event, ind) => ind > eventsList.length - 20);
        return eventsList;
    });
    return Promise.resolve(finalEventsList);
}




async function fetchOneEventDetail(page, events, index) {
    let url = events[index].eventId.split('/').pop();
    await page.goto('https://www.residentadvisor.net/events/' + url);
    let lineupPromises = [], lineup = [], lineUpElementsArray = [];
    let { lineUpElements, lineupTextContent, noLinkArray } = await page.evaluate(() => {
        return {
            lineUpElements: document.querySelector('.lineup').querySelectorAll('a'),
            lineupTextContent: document.querySelector('.lineup').textContent,
            noLinkArray: document.querySelector('.lineup').textContent.split(' (')[0].split(' -')[0].split(' aka')[0].split('\n').join(', ').split(', ')
        }
    });
    for (let i = 0; i < lineUpElements; i++) {
        lineUpElementsArray.push(lineUpElements[i].textContent);
    }
    if (lineUpElementsArray.length === 0) {
        if (lineupTextContent) {
            if (noLinkArray.length > 0 && noLinkArray[0] !== '') {
                noLinkArray = noLinkArray.filter(elm => elm !== '');
                lineUpElementsArray = lineUpElementsArray.concat(noLinkArray);
            }
        };
    }
    // console.log(lineUpElementsArray);
    lineUpElementsArray = lineUpElementsArray.filter(elm => elm !== '');

    for (let i = 0; i < Math.min(lineUpElementsArray.length, 7); i++) {
        let artist = lineUpElementsArray[i];
        artist = artist ? artist.split('(')[0].split('&')[0] : '';
        lineupPromises.push(getGenresFromArtistName(artist, i));
        if (lineUpElements[i]) {
            lineup.push({ name: artist, artistUrl: lineUpElements[i].href });
        } else {
            lineup.push({ name: artist, artistUrl: '' });
        }
    }
    events[index].lineup = lineup;
    events[index].genres = await Promise.all(lineupPromises);
    return Promise.resolve(events);
}

function getGenresFromArtistName(artist, index) {
    return utils.later(5000 * index).then(res => {
        return fetch('https://api.discogs.com/database/search?type=artist&q=' + artist + '&key=' + apiDiscogs)
    }).then(res => {
        return res.json();
    }).then(response => {
        // console.log(artist, response);
        let validResponses = response.results.filter(resArtist => resArtist.title.toLowerCase() === artist.toLowerCase());
        if (validResponses.length === 0) {
            return Promise.resolve([]);
        } else {
            return getAlbumsListFromArtist(validResponses[0].resource_url);
        }
    }).catch(function (err) {
        console.log("error", err);
    });
}

function getAlbumsListFromArtist(url) {
    return fetch(url + '/releases?key=' + apiDiscogs
    ).then(res => {
        return res.json();
    }).then(response => {
        // console.log('response artist', response);
        if (!response.releases || response.releases.length === 0) {
            return Promise.resolve([]);
        } else {
            let releases = response.releases.filter(rel => rel.year);
            releases = releases.sort((a, b) => a.year > b.year ? -1 : 1);
            return getReleaseGenresFromRelease(response.releases[0].resource_url);
        }
    });
}

function getReleaseGenresFromRelease(url) {
    return fetch(url + '?key=' + apiDiscogs).then(res => {
        return res.json();
    }).then(response => {
        // console.log('response album', response);
        if (!response.styles || response.styles.length === 0) {
            return Promise.resolve([]);
        } else {
            return response.styles;
        }
    });
}


(async () => {
    try {
        spinner.text = 'Starting headless browser';
        spinner.start();
        const browser = await puppeteer.launch();
        const promiseArray = amsterdam.reduce((acc, curr, index) => {
            console.log(index);
            console.log('curr', curr);
            console.log('acc', acc);
            return acc.then((res) => {
                console.log(res);
                return _processing(browser, curr.id, curr.club);
            })
        }, Promise.resolve());
        promiseArray.then(async (final) => {
            console.log(final)
            spinner.clear();
            await browser.close();
            process.exit(1);
        }).catch(err => {
            console.error(err);
        });
    } catch(err) {
        console.log('err', err);
        return process.exit(1);
    }
})();

async function _processing(browser, RAClubId, name) {
    const page = await browser.newPage();
    await page.goto('https://www.residentadvisor.net/club.aspx?id=' + RAClubId + '&show=events&yr=' + year);
    spinner.succeed();
    try {
        spinner.text = 'fetching all events of the year ';
        spinner.start();
        const events = await fetchYearEventsPage(page);
        spinner.succeed();


        spinner.text = 'Fetching genres and artists';
        spinner.start();
        const hackedevents = events; // [events[0]]; events
        let fullEventsPromise = hackedevents.reduce((acc, curr, index) => {
            return acc.then(data => {
                return fetchOneEventDetail(page, data, index);
            });
        }, Promise.resolve(fetchOneEventDetail(page, events, 0)));
        let fullEvents = await fullEventsPromise;
        const finish = utils.formatEvent(fullEvents);
        spinner.succeed();


        spinner.text = 'Saving to file...';
        spinner.start();

        utils.saveToFile(`${name}_${year}.txt`, JSON.stringify(finish), (err) => {
            if (err) {
                spinner.text = err;
                spinner.fail(err);
                return Promise.resolve(`${name} failed to save`);
            }
            // console.log('finish', finish);
            spinner.succeed();
            page.close();
            return Promise.resolve(`${name} done`);
        });

    } catch (err) {
        spinner.text = err;
        spinner.fail(err);
        page.close();
        return Promise.resolve(`${name} failed: ${err}`);
    }

}