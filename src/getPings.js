const crypto = require("crypto");
const fs = require("fs");
const https = require("https");

require("dotenv").config();

const streamers = JSON.parse(
  fs.readFileSync("./data/streamers.json", { encoding: "utf8", flag: "r" })
);

firstDayCleanExecuted = false;

const bots = [
  "streamholics",
  "streamelements",
  "streamlabs",
  "commanderroot",
  "carbot14xyz",
  "v_and_k",
  "virgoproz",
  "aten",
  "cleaning_the_house",
  "discord_for_streamers",
  "music_and_arts",
];

function checkStreamers(client) {
  streamers.forEach((user) => {
    https.get(
      "https://api.twitch.tv/kraken/streams/" + user.id,
      {
        headers: {
          Accept: "application/vnd.twitchtv.v5+json",
          "Client-ID": process.env.CLIENT_ID,
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          console.error(
            `Did not get an OK from the server. Code: ${res.statusCode}`
          );
          res.resume();
          return;
        }

        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("close", () => {
          streamerData = JSON.parse(data);
          if (streamerData.stream != null) {
            streamOn(streamerData, user, client);
          }
        });
      }
    );
  });
}

function streamOn(data, user, client) {
  https.get(
    "https://tmi.twitch.tv/group/user/" + user.name + "/chatters",
    (res) => {
      if (res.statusCode !== 200) {
        console.error(
          `Did not get an OK from the server. Code: ${res.statusCode}`
        );
        res.resume();
        return;
      }

      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("close", () => {
        parseChat(data, client);
      });
    }
  );
}

function parseChat(data, client) {
  chat = JSON.parse(data);
  const viewers = chat.chatters.moderators.concat(
    chat.chatters.vips.concat(chat.chatters.viewers)
  );
  viewers.forEach((viewer) => {
    if (bots.indexOf(viewer) == -1) {
      savePing(chat.chatters.broadcaster[0], viewer, client);
    }
  });
}

function savePing(broadcaster, user, client) {
  const dateNow = new Date();

  const pingsDB = client.db("xdeno").collection("pings");

  pingsDB.insertOne({
    channel: broadcaster,
    user: user,
    date: dateNow.toUTCString(),
  });
}

function removePingsOnMonthStart(client) {
  let dateNow = new Date();

  const pingsDB = client.db("xdeno").collection("pings");

  if (dateNow.getUTCDay() > 1) {
    firstDayCleanExecuted = false;
  } else if (dateNow.getUTCDay() == 1 && firstDayCleanExecuted == false) {
    pingsDB.remove({});
    firstDayCleanExecuted = true;
  }
}

exports.getPings = (client) => {
  checkStreamers(client);
  setInterval(() => {
    checkStreamers(client);
  }, 600000);
  setInterval(() => {
    removePingsOnMonthStart(client);
  }, 6000000);
};
