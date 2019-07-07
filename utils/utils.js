const fs = require('fs');


function later(delay) {
    return new Promise(function (resolve) {
        setTimeout(resolve, delay);
    });
}


function myFormatDate(date) {
    let formatedDate = '';
    if (date) {
        let dateTmp = date.split(', ')[1];
        if (dateTmp) {
            let year = dateTmp.split(' ')[2];
            let day = dateTmp.split(' ')[0];
            day = day.length === 1 ? '0' + day : day;
            let month = '';
            switch (dateTmp.split(' ')[1]) {
                case 'jan.': month = '01';
                case 'Jan': month = '01';
                case 'fév.': month = '02';
                case 'Feb': month = '02';
                case 'mar.': month = '03';
                case 'Mar': month = '03';
                case 'avr.': month = '04';
                case 'Apr': month = '04';
                case 'mai.': month = '05';
                case 'May': month = '05';
                case 'juin': month = '06';
                case 'Jun': month = '06';
                case 'juil.': month = '07';
                case 'Jul': month = '07';
                case 'août': month = '08';
                case 'Aug': month = '08';
                case 'sept.': month = '09';
                case 'Sep': month = '09';
                case 'oct.': month = '10';
                case 'Oct': month = '10';
                case 'nov.': month = '11';
                case 'Nov': month = '11';
                case 'déc.': month = '12';
                case 'Dec': month = '12';
                default: month = '01'
            }
            formatedDate = day + '-' + month + '-' + year;
        }
    }
    return formatedDate;
}

function formatEvent(fullEvents) {
    return fullEvents.map(event => {
        let genresObjects = [];
        let gernesNames = [];
        if (event.genres) {
            if (event.genres.length > 0 && event.genres[0]) {
                event.genres.forEach(genreArray => {
                    if (genreArray) {
                        if (genreArray.length > 0) {
                            genreArray.forEach(genre => {
                                // genreCount++;
                                if (gernesNames.indexOf(genre) === -1) {
                                    gernesNames.push(genre);
                                    genresObjects.push({ name: genre, count: 1 });
                                } else {
                                    genresObjects[gernesNames.indexOf(genre)].count++;
                                }
                                // if (countTotalGenresNames.indexOf(genre) === -1) {
                                //     countTotalGenresNames.push(genre);
                                //     countTotalGenres.push({ name: genre, count: 1 });
                                // } else {
                                //     countTotalGenres[countTotalGenresNames.indexOf(genre)].count++;
                                // }
                            });
                        }
                    }
                })
            }
        }
        event.genresObjects = genresObjects;
        return event;
    });
}

function saveToFile(filename, events, callback) {
    fs.writeFile(filename, events, 'utf8', callback);
}

function fileToObject(fileName) {

}

module.exports = {
    myFormatDate,
    later,
    formatEvent,
    saveToFile
}