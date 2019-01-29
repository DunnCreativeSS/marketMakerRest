// requires, etc
var RestClient = require("deribit-api").RestClient;
const express = require('express');
const app = express();
var request = require("request")
var bodyParser = require('body-parser')
app.set('view engine', 'ejs');
app.listen(process.env.PORT || 8080, function() {});


var ccxt = require("ccxt");
let exchange = new ccxt.deribit({
    'enableRateLimit': true,
    apiKey: "HwjG9hsiYvLb",
    secret: "MZ4XSMDKR4HPOLRUCZ7LVQ7VA6QXM6VY"
})
exchange.urls['api'] = exchange.urls['test'];
var restClient = new RestClient('HwjG9hsiYvLb', 'MZ4XSMDKR4HPOLRUCZ7LVQ7VA6QXM6VY', 'https://test.deribit.comparing');
var GoogleSpreadsheet = require('google-spreadsheet');
var async = require('async');
var Trendyways = require("./trendyways.min.js");
//vars
var bands = [];

var bbc = 0;

askHistory = []

// the amount BTC we begin the script with
var startBtc;

// our current BTC amount
var btcNow;

// sheet is the gsheet to add data to
var sheet;

// count is how many times we've entered a new order in the last x ms 
var count = 0;

// gogo is whether to create a new order
var gogo = true;
var gogobuy = true;
var gogosell = true;

// gogoFour is another counter, to keep new orders under x thresholds
var gogoFour = 0;

// pos is how large our position is
var pos;

// oldPerc is our old percent performance, to use when comparing to the new one after x ms
var oldPerc = 0;

// liq includes the recent reasons why we liquidated at market or limit, for gsheet
var liq;

// pnl is our profit and loss of a pos
var pnl;

// avail is our available margin
var avail;

// buying is the price we've bought
var buying;

// haOld is a previous value for highest ask
var haOld;

// lbOld is a previous value for lowest bid
var lbOld;

// selling is the price we've sold at
var selling;

// ha is the highest ask
var ha = 5000000000000000000000000000;

// lb is the lowest bid
var lb = 0;

// has is an array of highest asks (might be deprecated)
var has = []

// lbs is an array of lowest bids (might be deprecated)
var lbs = []

// tar is how big of a position to enter into
var tar;

// done3x is whether the most upper / most lower thresholds, bsaed on a multiplier of tar, have been hit or false if we're within acceptable ranges
var done3x = false;

// bv is the volume of contracts at lowest bid
var bv = 0;

// av s the volume of contracts at highest ask
var av = 0;

// can is whether to cancel certain orders (might be deprecated)
var can = false;

// our google doc

var doc = new GoogleSpreadsheet('1JzTU4VRnJWvg6oG7AVVsajwzSLL5OuYMM_E-OVpMMiA');

// function for providing views/index.ejs with more data

app.get('/update', (req, res) => {

    doPost(req, res)

})
let rest = {}
let dirBuyMult = 1;
let dirSellMult = 1;
let postOnly = true;
app.post('/rest', (req, res) => {
    doRest(req, res);

})
async function doRest(req, res) {

    var password = req.body.password,
        direction = req.body.direction,

        amountPotential = req.body.amountPotential,
        severity = req.body.severity,
        cancelOpp = req.body.cancelOpp,
        stopOppOrders = req.body.stopOppOrders;

    rest = {
        password: password,
        direction: direction,
        amountPotential: amountPotential,
        severity: severity,
        cancelOpp: cancelOpp,
        stopOppOrders: stopOppOrders,
        postOnly: req.body.postOnly
    }
    console.log(JSON.stringify(rest))

    if (password = "wordpass") {
        postOnly = req.body.postOnly;
        if (direction == 'buy') {
            if (stopOppOrders == 'true') {
                gogosell = false;
            } else if (stopOppOrders == 'false') {
                gogosell = true;
            }
            if (amountPotential != 'false'){
            var vol = 0;
            var contracts = 0;
            for (var i = 0; i <= amountPotential; i = i + 0.5) {
                vol += bvs[i * 2] * (lb + i);
                contracts += bvs[i * 2];
            }
            console.log('vol: ' + vol);
            if (avail * (lb + amountPotential) < vol) {
                console.log('canbuy');

                var o = await exchange.createMarketBuyOrder('BTC-PERPETUAL', contracts);
                console.log(o)
            }
            dirBuyMult = severity;
            if (cancelOpp == 'true') {
                restClient.getopenorders('BTC-PERPETUAL').then((result) => {
                    try {
                        for (var a in result) {
                            for (var o in result[a]) {
                                if (result[a][o].direction == 'sell') {
                                    //console.log('selling, pos < 0')
                                    //console.log('pos: ' + pos)
                                    restClient.cancel(result[a][o].orderId).then((result) => {

                                    })
                                }
                            }
                        }

                        if (pos > 0) {
                            gogobuy = false;
                        } else {

                            gogosell = false
                        }
                    } catch (err) {
                        console.log(err);
                    }
                })
            }
        }
        } else if (direction == 'sell') {
            if (stopOppOrders == 'true') {
                gogobuy = false;
            } else if (stopOppOrders == 'false') {
                gogobuy = true;
            }
            if (amountPotential != 'false'){
            var vol = 0;
            var contracts = 0;
            for (var i = 0; i <= amountPotential; i = i + 0.5) {
                vol += avs[i * 2] * (ha - i);
                contracts += avs[i * 2];
            }
            console.log('vol: ' + vol);
            if (avail * (ha - amountPotential) < vol) {
                console.log('cansell');

                var o = await exchange.createMarketSellOrder('BTC-PERPETUAL', -1 * contracts);
                console.log(o)
            }
            dirSellMult = severity;
            if (cancelOpp == 'true') {
                restClient.getopenorders('BTC-PERPETUAL').then((result) => {
                    try {
                        for (var a in result) {
                            for (var o in result[a]) {
                                if (result[a][o].direction == 'buy') {
                                    //console.log('selling, pos < 0')
                                    //console.log('pos: ' + pos)
                                    restClient.cancel(result[a][o].orderId).then((result) => {

                                    })
                                }
                            }
                        }

                        if (pos > 0) {
                            gogobuy = false;
                        } else {

                            gogosell = false
                        }
                    } catch (err) {
                        console.log(err);
                    }
                })
            }
        }
        }
    }
}
// initially load views/index.ejs

app.get('/', (req, res) => {
    doPost(req, res)


});

// set up our gsheets connection

async.series([
    function setAuth(step) {
        var creds = require('./googlesheets.json');

        doc.useServiceAccountAuth(creds, step);
    },
    function getInfoAndWorksheets(step) {
        doc
            .getInfo(function(err, info) {
                //////console.log('Loaded doc: ' + info.title + ' by ' + info.author.email);
                sheet = info.worksheets[0];
                //////console.log('sheet 1: ' + sheet.title + ' ' + sheet.rowCount + 'x' + sheet.colCount);
                step();
            });
    },
    function workingWithRows(step) {

    }
]);

// logic to send info to the view

async function doPost(req, res) {

    if (req.query.name) {
        //////console.log('name');
        res.json({
            percent: -1 * (100 * (1 - (btcNow / startBtc))).toPrecision(4),
            difference: btcNow - avail,
            btcNow: btcNow,
            avail: btcNow - avail,
            tar: tar,
            ha: ha,
            pos: pos,
            time: new Date().getTime()
        });

    } else {
        res.render('index.ejs', {
            percent: -1 * (100 * (1 - (btcNow / startBtc))).toPrecision(4),
            difference: btcNow - avail,
            btcNow: btcNow,
            avail: btcNow - avail,
            tar: tar,
            ha: ha,
            pos: pos,
            time: new Date().getTime()
        })
    }
}

// initially set our startBtc (static)

startBtc = 155;

// add info to gsheet every 60s

setInterval(function() {
    sheetaddrow();
}, 60000);

// and once 10s after load

setTimeout(function() {
    sheetaddrow();
}, 10000);
let gogobb = true;
// a failsafe that triggers if we use too much margin

setInterval(async function() {
    if (avail / btcNow > 0.55) {
        //console.log(new Date(Date.now()).toTimeString() + ': margin > 55%')
        liq += ' margin > 55%'
        restClient.positions().then((result) => {
            try {
                for (var r in result) {
                    for (var a in result[r]) {
                        if (result[r][a].direction == 'sell' && gogobuy && gogobb && gogov) {
                            restClient.buy('BTC-PERPETUAL', Math.floor(-1 * result[r][a].size * dirBuyMult), lb, postOnly).then((result) => {

                            });
                        } else if (gogosell && result[r][a].direction == 'buy' && gogobb && gogov) {
                            restClient.sell('BTC-PERPETUAL', Math.floor(1 * result[r][a].size * dirSellMult), lb, postOnly).then((result) => {

                            });
                        }
                    }
                }
            } catch (err) {
                console.log(err);
            }
        });
    }
}, 15000)

// a failsafe that triggers if portfolio loses a certan %

setInterval(async function() {
    if (oldPerc != 0) {
        let diff = -1 * (100 * (1 - (btcNow / startBtc))).toPrecision(4) - oldPerc
        if (diff < -15) {
            console.log(new Date(Date.now()).toTimeString() + ': portfolio > 15% loss since last direction switch, selling at market')
            liq += ' portfolio > 15% loss since last direction switch'
            restClient.positions().then((result) => {
                try {
                    setTimeout(async function() {
                        for (var r in result) {
                            for (var a in result[r]) {
                                pnlclosed += -1 * (100 * (1 - (btcNow / startBtc))).toPrecision(4);
                                if (result[r][a].direction == 'sell') {

                                    var o = await exchange.createMarketBuyOrder('BTC-PERPETUAL', Math.floor(-1 * result[r][a].size * dirBuyMult));
                                    console.log(o)
                                } else if (result[r][a].direction == 'buy') {
                                    var o = exchange.createMarketSellOrder('BTC-PERPETUAL', Math.floor(1 * result[r][a].size) * dirSellMult);
                                    console.log(o)
                                }
                            }
                        }

                        oldPerc = -1 * (100 * (1 - (btcNow / startBtc))).toPrecision(4);
                    }, 0);
                } catch (err) {
                    console.log(err);
                }
            });
        }
    }
}, 15000)

// helper for our gsheet date (broken at the moment)

Number.prototype.padLeft = function(base, chr) {
    var len = (String(base || 10).length - String(this).length) + 1;
    return len > 0 ? new Array(len).join(chr || '0') + this : this;
}

// add info to gsheet (date is broken at the moment)

function sheetaddrow() {
    //////console.log('addrow')
    try {
        var d = new Date,
            dformat = [(
                    d.getDate().padLeft(),
                    d.getMonth() + 1).padLeft(),
                d.getFullYear()
            ].join('/') + ' ' + [d.getHours().padLeft(),
                d.getMinutes().padLeft(),
                d.getSeconds().padLeft()
            ].join(':');
        sheet
            .addRow({
                'Time': dformat,
                'Pos': pos,
                'HA': ha,
                'recent rest': JSON.stringify(rest),
                'tar': tar,
                '5x 5min vol': v,
                'tar 1.5': tar * 1.5,
                'last liquidation': liq,
                'neg tar 1.5': tar * 1.5 * -1,
                'Avail': avail,
                'btcNow': btcNow,
                'PNL Current Pos': pnl * 100 + '%',
                'PNL Closed Failsafe': pnlclosed,
                'Difference': btcNow - avail,
                'Percent': -1 * (100 * (1 - (btcNow / startBtc))).toPrecision(4) + '%'

            }, function(result) {
                liq = '';
                rest = {};
                pnlclosed = 0;
            })
    } catch (err) { //////console.log(err);}
    }
}
let pnlclosed = 0;
// failsafe for if our position loses a % value\

// update our margin avail and btcnow values
let first = true;
setInterval(function() {
    restClient.account().then((result) => {
        //////console.log('1sec');
        avail = result.result.maintenanceMargin;
        if (result.result.maintenanceMargin == 0) {
            result.result.maintenanceMargin = 0.000000001
        }
        btcNow = (result.result.equity);
        if (first) {
            first = false;
            oldPerc = -1 * (100 * (1 - (btcNow / startBtc))).toPrecision(4);

        }
        if (avail / btcNow > 0.75) {
            console.log(new Date(Date.now()).toTimeString() + ': margin avail <25%, stopping orders in opposng direction')
            restClient.getopenorders('BTC-PERPETUAL').then((result) => {
                try {
                    var go = true;
                    for (var a in result) {
                        for (var o in result[a]) {
                            if (result[a][o].direction == 'sell' && pos < 0) {
                                //console.log('selling, pos < 0')
                                //console.log('pos: ' + pos)
                                restClient.cancel(result[a][o].orderId).then((result) => {

                                })
                                go = false;

                            } else if (result[a][o].direction == 'buy' && pos > 0) {
                                //console.log('buying, pos > 0')
                                //console.log('pos: ' + pos)
                                restClient.cancel(result[a][o].orderId).then((result) => {

                                })
                                go = false;
                            }
                        }
                    }

                    if (pos > 0) {
                        gogobuy = false;
                    } else {

                        gogosell = false
                    }
                } catch (err) {
                    console.log(err);
                }
            })
        } else {
            gogobuy = true;
            gogosell = true;
        }
    });
}, 5000)

// update our tar value based on a fraction of balance
let bvs = []
let avs = []
setInterval(function() {
    restClient.getorderbook('BTC-PERPETUAL').then((result) => {
        bv = 0;
        av = 0;
        bvs = []
        avs = []
        let count = 0;
        for (var a in result.result.bids) {
            bvs[count] = result.result.bids[a].quantity;
            count++;
            if (count <= 10) {
                bv += (result.result.bids[a].quantity);
            }
        }
        count = 0;
        for (var a in result.result.asks) {
            avs[count] = result.result.asks[a].quantity;
            count++;
            if (count <= 10) {
                av += (result.result.asks[a].quantity);
            }
        }
        let vol = av + bv;
        vol = vol / 5 * 4;
        if (vol > (btcNow * ha) / 1) {
            vol = (btcNow * ha) / 1;
        }
        tar = vol;
    })
}, 60000)

// sometimes orders get stuck. .. cancel them all!
/*
setInterval(function() {
    restClient.cancelall().then((result) => {

    })
}, 60 * 1000 * 60 * 5 * 5);
 */
// a failsafe that triggers two possibilities based on a functino of the tar variable
var posDir = 0;
var posDirOld = 0;
setInterval(async function() {
    //////console.log('interval')
    //////console.log(tar)
    restClient.positions().then((result) => {
        try {
            for (var r in result) {
                for (var a in result[r]) {
                    var laladir = result[r][a].size;
                    //////console.log(result[r][a].direction)
                    if (gogoFour < 25 && result[r][a].size > ((tar * 1.5)) || result[r][a].size < (-1 * (tar * 1.5))) {
                        var s = result[r][a].size;
                        //////console.log('20000')
                        if (result[r][a].direction == 'sell' && gogobuy && gogobb && gogov) {
                            //////console.log('buybuy')
                            restClient.buy('BTC-PERPETUAL', -1 * Math.floor(s / 4 * dirBuyMult), ha - 1.5, postOnly).then((result) => {
                                //////console.log(result);
                            });
                            restClient.buy('BTC-PERPETUAL', -1 * Math.floor(s / 4 * dirBuyMult), ha - 1.0, postOnly).then((result) => {
                                //////console.log(result);
                            });

                            restClient.buy('BTC-PERPETUAL', -1 * Math.floor(s / 4 * dirBuyMult), ha, postOnly).then((result) => {
                                //////console.log(result);
                            });

                            //////console.log(result);
                        } else if (result[r][a].direction == 'buy' && gogosell && gogobb && gogov) {
                            //////console.log('sellsell')
                            restClient.sell('BTC-PERPETUAL', Math.floor(s / 4 * dirSellMult), lb + 1.5, postOnly).then((result) => {
                                //////console.log(result);
                            });

                            restClient.sell('BTC-PERPETUAL', Math.floor(s / 4 * dirSellMult), lb + 1.0, postOnly).then((result) => {
                                //////console.log(result);
                            });

                            restClient.sell('BTC-PERPETUAL', Math.floor(s / 4 * dirSellMult), lb, postOnly, ).then((result) => {
                                //////console.log(result);
                            });
                        }
                    }
                    if (result[r][a].size < ((tar * 3)) || result[r][a].size > (-1 * (tar * 3))) {
                        done3x = false;
                    }
                    if (done3x == false && gogoFour < 25 && result[r][a].size > ((tar * 3)) || result[r][a].size < (-1 * (tar * 3))) {
                        done3x = true;
                        liq += 'double outter bounds'
                        //console.log(new Date(Date.now()).toTimeString() + ': double outter bounds')
                        var s = result[r][a].size;
                        //////console.log('20000')
                        if (result[r][a].direction == 'sell' && gogobuy && gogobb && gogov) {
                            //////console.log('buybuy')
                            restClient.buy('BTC-PERPETUAL', -1 * Math.floor(s / 4 * dirBuyMult), lb - 1.5, postOnly).then((result) => {
                                //////console.log(result);
                                //////console.log(result);
                            });
                            restClient.buy('BTC-PERPETUAL', -1 * Math.floor(s / 4 * dirBuyMult), lb - 1.0, postOnly).then((result) => {
                                //////console.log(result);
                                //////console.log(result);
                            });
                            restClient.buy('BTC-PERPETUAL', -1 * Math.floor(s / 4 * dirBuyMult), lb - 0.5, postOnly).then((result) => {
                                //////console.log(result);
                                //////console.log(result);
                            });
                        } else if (result[r][a].direction == 'buy' && gogosell && gogobb && gogov) {
                            //////console.log('sellsell')
                            restClient.sell('BTC-PERPETUAL', Math.floor(s / 4 * dirSellMult), ha + 1.5, postOnly).then((result) => {
                                //////console.log(result);
                            });
                            restClient.sell('BTC-PERPETUAL', Math.floor(s / 4 * dirSellMult), ha + 1.0, postOnly).then((result) => {
                                //////console.log(result);
                            });
                            restClient.sell('BTC-PERPETUAL', Math.floor(s / 4 * dirSellMult), ha + 0.5, postOnly).then((result) => {
                                //////console.log(result);
                            });
                        }
                    }
                    oldPerc
                }
                oldPerc
            }
            if (laladir < 0) {
                posDirOld = posDir;
                posDir = -1;
            } else {

                posDirOld = posDir;
                posDir = 1;
            }
            if (posDirOld != posDir) {
                console.log('switcheroo');
                console.log(posDir)
                console.log(posDirOld)
                oldPerc = -1 * (100 * (1 - (btcNow / startBtc))).toPrecision(4);
                console.log('oldperc: ' + oldPerc)
            }
        } catch (err) {
            console.log(err);
        }
    })


}, 12500);

// if price has moved more than a certain number $, cancel all orders

setInterval(function() {
    restClient.getopenorders('BTC-PERPETUAL').then((result) => {
        try {
            var go = true;
            if (gogobb && gogov) {
                for (var a in result) {
                    for (var o in result[a]) {
                        //////console.log(result[a][o])                                           
                        if (result[a][o].direction == 'sell' && result[a][o].price > lb + 2) {
                            console.log('selling, cancel lb + 2')
                            restClient.cancel(result[a][o].orderId).then((result) => {

                            })

                        } else if (result[a][o].direction == 'buy' && result[a][o].price < ha + 2) {
                            console.log('buying, cancel ha - 2')
                            restClient.cancel(result[a][o].orderId).then((result) => {

                            })
                        }
                    }
                }
            }
        } catch (err) {
            console.log(err);
        }
    })
}, 35000)

// buy or sell if no other buy/sell order exists

setInterval(function() {
    restClient.getopenorders('BTC-PERPETUAL').then((result) => {
        try {
            var go = true;
            for (var a in result) {
                for (var o in result[a]) {
                    if (result[a][o].direction == 'sell') {

                        go = false;

                    } else if (result[a][o].direction == 'buy') {
                        go = false;
                    }
                }
            }
            restClient.positions().then((result) => {
                for (var r in result) {
                    for (var a in result[r]) {
                        pos = (result[r][a].size)
                    }
                }
            });
            if (go) {
                if (gogoFour < 10 && gogosell && gogobb && gogov) {
                    gogoFour++;
                    restClient.sell('BTC-PERPETUAL', Math.floor(tar * dirSellMult), ha, postOnly).then((result) => {});
                }
                if (gogoFour < 10 && gogobuy && gogobb && gogov) {
                    gogoFour++;
                    restClient.buy('BTC-PERPETUAL', Math.floor(tar * dirBuyMult), lb, postOnly).then((result) => {});

                }
            }
        } catch (err) {
            console.log(err);
        }
    });

}, 15000);

// calseculate ha, lb, etc, increase tar or reset, enter buy or sell
setInterval(function() {
    restClient.getorderbook('BTC-PERPETUAL').then((result) => {
        try {
            ha = 5000000000000000000000000000;
            lb = 0;
            bv = 0;
            av = 0;
            for (var a in result.result.bids) {
                if (result.result.bids[a].price > lb) {
                    lb = result.result.bids[a].price;
                    bv = (result.result.bids[a].quantity);
                    lbOld = lb;
                    if (lbs.length == 10) {
                        lbs.shift();
                    }
                }
            }
            for (var a in result.result.asks) {
                if (result.result.asks[a].price < ha) {
                    ha = result.result.asks[a].price
                    av = (result.result.asks[a].quantity);
                    haOld = ha
                }
            }
            if (lb != buying) {
                bv = 0;
                av = 0;
                let count = 0;
                for (var a in result.result.bids) {
                    count++;
                    if (count <= 10) {
                        bv += (result.result.bids[a].quantity);
                    }
                }
                count = 0;
                for (var a in result.result.asks) {
                    count++;
                    if (count <= 10) {
                        av += (result.result.asks[a].quantity);
                    }
                }
                let vol = av + bv;
                vol = vol / 5 * 4;
                if (vol > (btcNow * ha) / 1) {
                    vol = (btcNow * ha) / 1;
                }
                tar = vol;

            }
        } catch (err) {
            console.log(err);
        }
    })
}, 550)
let gogov = true;
let vs = []
let v = 0;
setInterval(function() {
    ohlcv();
}, 60 * 1 * 1000)
let doV = true;
async function liquidate() {
    restClient.positions().then((result) => {
        try {
            setTimeout(async function() {
                for (var r in result) {
                    for (var a in result[r]) {
                        pnlclosed += -1 * (100 * (1 - (btcNow / startBtc))).toPrecision(4);
                        if (result[r][a].direction == 'sell') {

                            var o = await exchange.createMarketBuyOrder('BTC-PERPETUAL', Math.floor(-1 * result[r][a].size) * dirBuyMult);
                            console.log(o)
                        } else if (result[r][a].direction == 'buy') {
                            var o = exchange.createMarketSellOrder('BTC-PERPETUAL', Math.floor(1 * result[r][a].size) * dirSellMult);
                            console.log(o)
                        }
                    }
                }
            }, 0);
        } catch (err) {
            console.log(err);
        }
    });
}
async function ohlcv() {
    let since = exchange.milliseconds() - 1000 * 5 * 60

    let ohlcvs = await exchange.fetchOHLCV('BTC-PERPETUAL', '5m', since, 5)
    if ((exchange.milliseconds() - ohlcvs[ohlcvs.length - 1][0]) / 1000 / 60 > 4.5 && doV) {
        vs.push(ohlcvs[ohlcvs.length - 1][5])
        doV = false;
        if (vs.length > 5) {
            vs.shift();
        }
        v = 0;
        for (var vol in vs) {
            v += ((vs[vol] * 10) / ha)

        }

        if (v > 41) {
            console.log('gogov true v: ' + v + ' vs.length: ' + vs.length);
            gogov = true;
        } else {
            console.log('gogov false v: ' + v + ' vs.length: ' + vs.length)
            gogov = true;
            /*
            restClient.cancelall().then((result) => {
                setTimeout(function(){
                    liquidate();    
            }, 120 * 1000)

            })
            */
        }
    }
    if ((exchange.milliseconds() - ohlcvs[ohlcvs.length - 1][0]) / 1000 / 60 < 4.5 && doV == false) {
        doV = true;
    }
}
ohlcv();
setInterval(function() {
    restClient.index((result) => {
        try {
            let index = (result.result.btc)
            if (askHistory[bbc] == undefined) {
                askHistory[bbc] = []
            }
            if (bands[bbc] == undefined) {
                bands[bbc] = {}
            }

            askHistory[bbc].push({
                c: (((ha + lb) / 2) + index) / 2
            });

            if (askHistory[bbc].length > 8) {
                askHistory[bbc].shift();
                for (var k = 1; k < 4; k++) {
                    for (var n = 1; n < askHistory[bbc].length; n++) {

                        bands[bbc] = bollinger(askHistory[bbc], n, k);

                    }
                }
                var bb = -1 * (100 * (1 - bands[bbc][bands[bbc].length - 1].ub / bands[bbc][bands[bbc].length - 1].lb))
                if (bbc == 1) {
                    console.log('bb: ' + bb)
                }
                if (bb > 0.15 && gogov) {
                    console.log('gogobb false ' + bb)
                    restClient.getopenorders('BTC-PERPETUAL').then((result) => {
                        for (var a in result) {
                            for (var o in result[a]) {
                                if (result[a][o].direction == 'sell' && pos < 0) {
                                    //console.log('selling, pos < 0')
                                    //console.log('pos: ' + pos)
                                    restClient.cancel(result[a][o].orderId).then((result) => {

                                    })

                                } else if (result[a][o].direction == 'buy' && pos > 0) {
                                    //console.log('buying, pos > 0')
                                    //console.log('pos: ' + pos)
                                    restClient.cancel(result[a][o].orderId).then((result) => {

                                    })
                                }
                            }
                        }
                    })
                    gogobb = true;
                } else {
                    gogobb = true;
                }
            }
            bbc++;
            if (bbc > 15) {
                bbc = 0;
            }
        } catch (err) {
            console.log(err);
        }
    });
}, 4000)
setInterval(function() {

    if (gogo == true && gogoFour < 10 && gogobuy && gogobb && gogov) {
        if (avail / btcNow < 0.25) {
            tar = tar + btcNow * 1200
        }
        gogoFour++;
        can = true;
        setTimeout(function() {
            restClient.buy('BTC-PERPETUAL', Math.floor(tar * dirBuyMult), lb, postOnly).then((result) => {
                buying = lb;
                count++;
            });
        }, 800);
    }
    if (gogo == true && gogoFour < 10 && gogosell && gogobb && gogov) {
        if (avail / btcNow < 0.25) {
            tar = tar + btcNow * 1200
        }
        gogoFour++;
        can = true;
        setTimeout(function() {
            restClient.sell('BTC-PERPETUAL', Math.floor(tar * dirSellMult), ha, postOnly).then((result) => {
                selling = ha;
            });
        }, 800);
    }


}, 4250);
setInterval(function() {
    restClient.getopenorders('BTC-PERPETUAL').then((result) => {
        try {
            gogoFour = 0;
            for (var a in result) {
                for (var o in result[a]) {
                    gogoFour++;
                }
            }
        } catch (err) {
            console.log(err);
        }
    })
}, 5000)

// pause new orders if too many occur within x ms

setInterval(function() {
    if (count > 3) {
        //console.log(new Date(Date.now()).toTimeString() + ': taking 20s break from orders because 4+ orders in last 8s')
        liq += 'not actually liquidating, but there were 4+ buys/sells at new prices so we took a 20s break'
        gogo = false;
        setTimeout(function() {
            gogo = true;
        }, 20000)
    }
    count = 0;
}, 8000)