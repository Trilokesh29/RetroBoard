const MongoClient = require("mongodb").MongoClient;
var ObjectID = require("mongodb").ObjectID;
const bcrypt = require('bcrypt');
const { use } = require("../routes/databasebroker");
const dbName = "RetroBoard";
const collectionName = "Teams";
// this is a single collection which contains all the details
const collectionHappiness = "Happiness";
const collectionVelocity = "Velocity";
const collectionLoginInfo = "Login";
const votesAllowedPerMember = 3;
const saltRounds = 10;

class DBConnection {
  static async connectToMongo() {
    if (this.db) return this.db;
    this.connection = await MongoClient.connect(
      this.url,
      { useUnifiedTopology: true },
      this.options
    );
    this.db = this.connection.db(dbName);

    this.db.createCollection(collectionLoginInfo, function (err, result) {
      if (err) throw err;
      console.log("Collection :" + collectionLoginInfo + " is created!!!");
    })
    this.db.createCollection(collectionName, function (err, result) {
      if (err) throw err;
      console.log("Collection :" + collectionName + " is created!!!");
    });
    this.db.createCollection(collectionHappiness, function (err, result) {
      if (err) throw err;
      console.log("Collection :" + collectionHappiness + " is created!!!");
    });
    this.db.createCollection(collectionVelocity, function (err, result) {
      if (err) throw err;
      console.log("Collection :" + collectionVelocity + " is created!!!");
    });
    console.log("database connection complete!!!");
    return this.db;
  }
  static async closeDB() {
    this.connection.close();
    console.log("DB closed");
  }
}

DBConnection.db = null;
DBConnection.connection = null;
DBConnection.url = "mongodb://127.0.0.1:27017/";
DBConnection.options = {
  bufferMaxEntries: 0,
  reconnectTries: 5000,
  useNewUrlParser: true,
};

class DBClient {
  static async addItemToCollection(item) {
    return await DBConnection.db.collection(collectionName).insertOne(item);
  }

  static async viewCompleteBoard(teamName, sprintName) {
    let query = {
      team: teamName,
      sprint: sprintName,
    };
    return DBConnection.db.collection(collectionName).find(query).toArray();
  }

  static async viewByUserName(userName) {
    let myQuery = { name: userName };
    return await DBConnection.db
      .collection(collectionName)
      .find(myQuery)
      .toArray();
  }

  static async addToDataBase(userInfo) {
    return await DBConnection.db
      .collection(collectionName)
      .insertOne(userInfo)
      .toArray();
  }

  static async findTeam(teamName) {
    let myQuery = { team: teamName };
    return await DBConnection.db
      .collection(collectionName)
      .find(myQuery)
      .toArray();
  }

  static async getColumnSettings(team) {
    let dbQuery = { teamName: team, setting: "columns" };
    return await DBConnection.db.collection(collectionName).findOne(dbQuery);
  }

  static async findSprint(teamName, sprintName) {
    let myQuery = {
      teamName: teamName,
      sprintName: sprintName,
    };
    return await DBConnection.db
      .collection(collectionName)
      .find(myQuery)
      .toArray();
  }

  /**
   *
   * @param {name of the team where setting are applied} teamName
   * @param {original column value "Good", "Bad", or "Ugly"} col
   * @param {new column value} value
   */
  static async renameColumn(teamName, col, value) {
    let settingsQuery = {
      teamName: teamName,
      setting: "columns",
    };
    return await DBConnection.db
      .collection(collectionName)
      .findOne(settingsQuery, function (err, result) {
        if (err) throw err;
        else if (result) {
          // if setting exists: update
          let update = {};
          update[col] = value;
          DBConnection.db
            .collection(collectionName)
            .updateOne(
              { _id: new ObjectID(result._id) },
              { $set: update },
              { upsert: false }
            );
        } // if setting does not exist: create one
        else {
          let defaultColumns = {
            teamName: teamName,
            setting: "columns",
            Good: "Good",
            Bad: "Bad",
            Ugly: "Ugly",
          };
          defaultColumns[col] = value;
          DBConnection.db
            .collection(collectionName)
            .insertOne(defaultColumns, function (err, result) {
              if (err) throw err;
            });
        }
      });
  }

  static async getTeams(userInfo) {

    let teams = await DBConnection.db
      .collection(collectionName)
      .distinct("team");
    return teams.sort();

    // let userData = await DBConnection.db
    //   .collection(collectionLoginInfo).findOne({ userName: userInfo.userName })

    // return userData.teams.sort();
  }

  static async getSprintsForATeam(teamName) {
    let myQuery = {
      team: teamName,
    };
    let sprints = await DBConnection.db
      .collection(collectionName)
      .distinct("sprint", myQuery);

    return sprints.sort();
  }

  static async viewByUserName(userName) {
    let myQuery = { name: userName };
    return await Connection.db
      .collection(collectionName)
      .find(myQuery)
      .toArray();
  }

  static async getListOfCollections() {
    return await DBConnection.db.listCollections().toArray();
  }

  static async createNewSprint(sprintName) {
    return await createCollection(sprintName);
  }

  static async addVote(userInfo) {
    let voterExists = await DBConnection.db.collection(collectionName).findOne({ _id: userInfo._id, "Voter.List.voterName": userInfo.userName }
    );

    if (null === voterExists) {
      await DBConnection.db.collection(collectionName).updateOne({ _id: userInfo._id },
        {
          $addToSet:
            { "Voter.List": { "voterName": userInfo.userName, "voteCount": 1 } }
        },
        { upsert: true }
      );
    }
    else {
      await DBConnection.db.collection(collectionName).updateOne({ _id: userInfo._id, "Voter.List.voterName": userInfo.userName },
        { $inc: { "Voter.List.$.voteCount": 1 } });
    }

    return await DBConnection.db
      .collection(collectionName)
      .updateOne({ _id: userInfo._id }, { $inc: { votes: 1 } });

  }

  static async removeVote(userInfo) {

    let returnVal = -2;

    let info = await DBConnection.db
      .collection(collectionName).findOne({ _id: userInfo._id });

    let voterIndex = -1;

    if (typeof info.Voter !== 'undefined' && typeof info.Voter.List !== 'undefined') {
      for (let index = 0; index < info.Voter.List.length; index++) {
        if (info.Voter.List[index].voterName === userInfo.userName) {
          voterIndex = index;
          break;
        }
      }
    }

    if ((-1 !== voterIndex) && (info.Voter.List[voterIndex].voteCount > 0)) {

      await DBConnection.db.collection(collectionName).updateOne({ _id: userInfo._id, "Voter.List.voterName": userInfo.userName },
        { $inc: { "Voter.List.$.voteCount": -1 } });

      if (info.votes > 0) {
        return await DBConnection.db
          .collection(collectionName)
          .updateOne({ _id: userInfo._id }, { $inc: { votes: -1 } });
      }
      else {
        returnVal = -1;
      }
    }

    return JSON.stringify(returnVal);
  }

  static async addActionPointToItem(actionData) {
    await DBConnection.db
      .collection(collectionName)
      .updateOne(
        { _id: actionData._id },
        { $push: { actionPoints: actionData.actionPoint } },
        { upsert: true }
      );
    return await DBConnection.db
      .collection(collectionHappiness)
      .find({ _id: actionData._id })
      .toArray();
  }

  static async removeHappiness(userInfo) {

    let myQuery = {
      _id: userInfo.id,
    };
    let happinessInfo = await DBConnection.db
      .collection(collectionHappiness)
      .findOne(myQuery);

    if (happinessInfo.name === userInfo.userName) {
      return await DBConnection.db
        .collection(collectionHappiness)
        .deleteOne(myQuery);
    }
    return JSON.stringify(-1);
  }

  static async updateHappiness(query) {
    let myQuery = {
      _id: query._id,
      team: query.team,
      name: query.name,
      sprint: query.sprint,
    };

    let data = await DBConnection.db
      .collection(collectionHappiness).findOne({
        team: query.team,
        name: query.name,
        sprint: query.sprint
      });


    if (null === data) {
      return await DBConnection.db
        .collection(collectionHappiness)
        .updateOne(
          myQuery,
          { $set: { happiness: query.happiness } },
          { upsert: true });
    }
    else if (data.happiness !== query.happiness) {
      await DBConnection.db
        .collection(collectionHappiness).replaceOne(
          {
            team: query.team,
            name: query.name,
            sprint: query.sprint
          },
          {
            team: query.team,
            name: query.name,
            sprint: query.sprint,
            happiness: query.happiness
          });
    }

    return data;
  }

  static async setVelocity(reqBody) {
    let velocity = {
      team: reqBody.team,
      sprint: reqBody.sprint,
    };
    return await DBConnection.db.collection(collectionVelocity).updateOne(
      velocity,
      {
        $set: {
          spPlanned: reqBody.spPlanned,
          spBurnt: reqBody.spBurnt,
          pi: reqBody.pi,
          bbAccuracy: reqBody.bbAccuracy,
        },
      },
      { upsert: true }
    );
  }

  static async setSortingCriteria(teamName, sprintName, sortingCriteria) {
    let myQuery = {
      team: teamName,
      sprint: sprintName,
    };
    return await DBConnection.db
      .collection(collectionName)
      .updateOne(
        myQuery,
        { $set: { sorting: sortingCriteria } },
        { upsert: true }
      );
  }

  static async getSortingCriteria(teamName, sprintName) {

    let myQuery = {
      team: teamName,
      sprint: sprintName,
    };

    let data = await DBConnection.db
      .collection(collectionName)
      .distinct("sorting", myQuery);

    return data;
  }

  static async checkIfVotingAllowed(userInfo) {

    let myQuery = {
      team: userInfo.team,
      sprint: userInfo.sprint,
    };

    let users = await DBConnection.db
      .collection(collectionName)
      .distinct("name", myQuery);

    let total = 0;
    let countOfUserVotes = 0;

    let sprintData = await DBConnection.db.collection(collectionName).find(myQuery).toArray();

    sprintData.forEach(info => {
      if (typeof info.votes !== 'undefined') {
        total += info.votes;
      }

      if ((typeof info.Voter !== 'undefined') && (typeof info.Voter.List !== 'undefined')) {

        for (let index = 0; index < info.Voter.List.length; index++) {
          if (info.Voter.List[index].voterName === userInfo.userName) {
            countOfUserVotes += info.Voter.List[index].voteCount;
            break;
          }
        }
      }
    })

    return [(countOfUserVotes < votesAllowedPerMember), total];
  }

  static async getVelocity(query) {
    return await DBConnection.db
      .collection(collectionVelocity)
      .find(query)
      .toArray();
  }

  static async getPIListForATeam(query) {
    return await DBConnection.db
      .collection(collectionVelocity)
      .distinct("pi", query);
  }
  static async getSprintsForAPI(query) {
    let sprints = await DBConnection.db
      .collection(collectionVelocity)
      .distinct("sprint", query);

    return sprints.sort();
  }
  static async getHappinessForASprint(query) {
    return await DBConnection.db
      .collection(collectionHappiness)
      .find(query)
      .toArray();
  }

  static async getAvgHappinessForASprint(query) {
    let data = await DBConnection.db
      .collection(collectionHappiness)
      .find(query)
      .toArray();
    let length = data.length;
    let sum = 0;
    for (let index = 0; index < length; index++) {
      sum += Number(data[index].happiness);
    }

    const average = (sum / length).toFixed(2);
    let myRet = {
      average: average,
    };

    return myRet;
  }

  static async getTopVotedItemsForASprint(query) {
    const data = await DBConnection.db
      .collection(collectionName)
      .find(query)
      .sort({ votes: -1 })
      .limit(3)
      .toArray();

    return data;
  }

  static async deletePost(userInfo) {

    let postInfo = await DBConnection.db.collection(collectionName).findOne({ _id: userInfo._id });
    if (postInfo.name === userInfo.userName)
      return await DBConnection.db.collection(collectionName).deleteOne({
        _id: userInfo._id,
      });
    else {
      return -1;
    }
  }

  static async moveAcrossColumn(updateData) {
    return await DBConnection.db
      .collection(collectionName)
      .updateOne({ _id: updateData._id }, { $set: { type: updateData.type } });
  }

  static async editSprintNameOfATeam(updateData) {
    let teamInfo = {
      team: updateData.team,
      sprint: updateData.sprint,
    };
    return await DBConnection.db
      .collection(collectionVelocity)
      .updateMany(
        teamInfo,
        {
          $set: {
            sprint: updateData.newSprint,
          },
        },
        { upsert: true }
      )
      .then(async () => {
        return await DBConnection.db.collection(collectionHappiness).updateMany(
          teamInfo,
          {
            $set: {
              sprint: updateData.newSprint,
            },
          },
          { upsert: true }
        );
      })
      .then(async () => {
        return await DBConnection.db.collection(collectionName).updateMany(
          teamInfo,
          {
            $set: {
              sprint: updateData.newSprint,
            },
          },
          { upsert: true }
        );
      });
  }

  static async editNameOfATeam(updateData) {
    let teamInfo = {
      team: updateData.team,
    };
    return await DBConnection.db
      .collection(collectionVelocity)
      .updateMany(
        teamInfo,
        {
          $set: {
            team: updateData.newTeam,
          },
        },
        { upsert: true }
      )
      .then(async () => {
        return await DBConnection.db.collection(collectionHappiness).updateMany(
          teamInfo,
          {
            $set: {
              team: updateData.newTeam,
            },
          },
          { upsert: true }
        );
      })
      .then(async () => {
        return await DBConnection.db.collection(collectionName).updateMany(
          teamInfo,
          {
            $set: {
              team: updateData.newTeam,
            },
          },
          { upsert: true }
        );
      });
  }

  static async moveAnItem(updateData) {
    return await DBConnection.db
      .collection(collectionName)
      .updateOne(
        { _id: updateData._id },
        { $set: { type: updateData.type, index: updateData.index } }
      );
  }

  static async getActionItemsForASprint(reqData) {
    return await DBConnection.db
      .collection(collectionName)
      .distinct("actionPoints", reqData);
  }

  static async verifyAndSignUp(signUpData) {

    let doesUserExits = await DBConnection.db.collection(collectionLoginInfo).findOne({ userName: signUpData.userName });

    if (doesUserExits) {
      return JSON.stringify(-1);
    }

    signUpData.password = bcrypt.hashSync(signUpData.password, saltRounds);

    let addUser = await DBConnection.db.collection(collectionLoginInfo).insertOne(signUpData);

    if (!addUser)
      return -2;

    const hash = bcrypt.hashSync(addUser.ops[0]._id, saltRounds);

    let userInfo =
    {
      sessionId: hash,
      userName: addUser.ops[0].userName,
      teams: addUser.ops[0].teams,
      role: addUser.ops[0].role
    };

    return userInfo;
  }

  static async authenticate(loginData) {

    let userInfo = await DBConnection.db.collection(collectionLoginInfo).findOne({ userName: loginData.userName });

    if (!userInfo || !bcrypt.compareSync(loginData.password, userInfo.password)) {
      return -1;
    }

    const hash = bcrypt.hashSync(userInfo._id, saltRounds);

    let logInfo =
    {
      sessionId: hash,
      userName: userInfo.userName,
      teams: userInfo.teams,
      role: userInfo.role
    };

    return logInfo;
  }

  static async isSessionValid(userInfo, checkTeamName) {

    let doesUserExits = await DBConnection.db.collection(collectionLoginInfo).findOne({ userName: userInfo.userName });

    if (!doesUserExits) {
      return false;
    }

    if (!bcrypt.compareSync(doesUserExits._id.toString(), userInfo.sessionId)) {
      return false;
    }

    // if (true === checkTeamName) {
    //   return doesUserExits.teams.includes(userInfo.teamName)
    // }

    return true;
  }
}

module.exports = {
  DBConnection,
  DBClient,
};
