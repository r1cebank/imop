
/*
  * I'M OP
  * https://github.com/r1cebank/imop
  * Copyright (c) 2015 Siyuan Gao
  * Licensed under the MIT license
 */

(function() {
  var Q, _, app, championMap, champions, config, express, hbs, model, path, port;

  express = require('express');

  app = express();

  hbs = require('hbs');

  path = require('path');

  Q = require('q');

  _ = require('lodash');

  config = require('./config/server-config.json');

  champions = require('./config/champion.json');

  championMap = {};

  Object.keys(champions.data).forEach(function(key) {
    return championMap[champions.data[key].key] = key;
  });

  model = require('./models.js')();

  app.set('view engine', 'html');

  app.engine('html', hbs.__express);

  app.set('views', path.join(__dirname, 'views/'));

  app.use(express["static"](path.join(__dirname, 'views/public/')));

  app.get('/', function(req, res) {
    return res.render('index');
  });

  app.get('/riot.txt', function(req, res) {
    return res.send('997c3ed4-8103-481c-8cec-42e688efd5c5');
  });

  app.get('/summoner/:name', function(req, res) {
    var gameData, hdbData, summary, summoner, summonerData, summonerName;
    summonerName = req.params['name'];
    summonerData = {};
    gameData = [];
    summary = {};
    hdbData = {};
    console.log("User " + req.params['name'] + " querying");
    summoner = model.getSummonerByName(summonerName);
    return summoner.then(function(data) {
      summonerData = data[summonerName.toLowerCase().replace(/\s+/g, '')];
      return hdbData = {
        name: summonerData['name'],
        level: summonerData['summonerLevel'],
        iconid: summonerData['profileIconId']
      };
    }).then(function() {
      return summary = model.getSummary(summonerData['id']);
    }).then(function(data) {
      var i, len, map, ref, row;
      map = {};
      ref = data['playerStatSummaries'];
      for (i = 0, len = ref.length; i < len; i++) {
        row = ref[i];
        map[row.playerStatSummaryType] = row.wins;
      }
      hdbData['unranked'] = map['Unranked'];
      return hdbData['RankedSolo5x5'] = map['RankedSolo5x5'];
    }).then(function() {
      var recent;
      return recent = model.getRecentGames(summonerData['id']);
    }).then(function(data) {
      var gameResult, games, i, j, len, len1, player, playerDataPromises, players, ref, row, teamID;
      players = [];
      playerDataPromises = [];
      games = data['games'];
      for (i = 0, len = games.length; i < len; i++) {
        row = games[i];
        teamID = row.teamId;
        ref = row.fellowPlayers;
        for (j = 0, len1 = ref.length; j < len1; j++) {
          player = ref[j];
          if (teamID === player.teamId) {
            players.push(player.summonerId);
          }
        }
        gameResult = "lose";
        if (row.stats.win) {
          gameResult = "win";
        }
        gameData.push({
          subtype: row.subType.toLowerCase(),
          kill: row.stats.championsKilled,
          death: row.stats.numDeaths,
          assist: row.stats.assists,
          level: row.stats.level,
          kda: (row.stats.championsKilled / row.stats.numDeaths).toFixed(3),
          cs: row.stats.minionsKilled,
          timeM: Math.floor(row.stats.timePlayed / 60),
          timeS: row.stats.timePlayed - Math.floor(row.stats.timePlayed / 60) * 60,
          result: gameResult,
          championID: row.championId,
          multiKill: row.stats.largestMultiKill,
          gold: (row.stats.goldEarned / 1000).toFixed(3),
          ward: row.stats.wardPlaced,
          ip: row.ipEarned,
          killpermin: (row.stats.championsKilled / Math.floor(row.stats.timePlayed / 60)).toFixed(3),
          op: model.calculateOPS(row)
        });
        players = [];
      }
      return hdbData['gamedata'] = gameData;
    }).then(function() {
      return _.each(gameData, function(d) {
        return d.championName = championMap[d.championID];
      });
    }).then(function() {
      console.log('sending response back');
      return res.render('mainView', hdbData);
    });
  });

  port = process.env.PORT || 3939;

  app.listen(port);

}).call(this);