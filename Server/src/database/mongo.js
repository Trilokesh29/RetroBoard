const { MongoClient } = require("mongodb");
const {
  createIdentifier,
  createPasswordHash,
  createSessionToken,
  encryptSecret,
  hashSessionToken,
  verifyPassword,
} = require("../auth/security");
const dbName = "RetroBoard";
const collectionName = "Teams";
// this is a single collection which contains all the details
const collectionHappiness = "Happiness";
const collectionVelocity = "Velocity";
const collectionLoginInfo = "Login";
const collectionSessions = "Sessions";
const collectionTeamSettings = "TeamSettings";
const votesAllowedPerMember = 3;
const sessionDurationInMs = 1000 * 60 * 60 * 24 * 7;
const defaultUserRole = ["user"];
const defaultTeams = ["test_playground", "ehv_psa_all"];
const defaultColumns = {
  setting: "columns",
  Good: "Good",
  Bad: "Bad",
  Ugly: "Ugly",
};
const defaultTeamConfiguration = {
  jira: {
    enabled: false,
    boardUrl: "",
    baseUrl: "",
    boardId: "",
    projectKey: "",
    userName: "",
    hasCredentials: false,
  },
};

function normalizeUserRecord(userRecord) {
  if (!userRecord) {
    return null;
  }

  return {
    id: userRecord._id,
    userName: userRecord.userName,
    emailId: userRecord.emailId,
    role: userRecord.role || defaultUserRole,
    teams: userRecord.teams || defaultTeams,
  };
}

class DBConnection {
  static async connectToMongo() {
    if (this.db) return this.db;
    this.connection = new MongoClient(this.url, this.options);
    await this.connection.connect();
    this.db = this.connection.db(dbName);

    this.db.createCollection(collectionLoginInfo, function (err, result) {
      if (err && err.codeName !== "NamespaceExists") throw err;
      console.log("Collection :" + collectionLoginInfo + " is ready");
    })
    this.db.createCollection(collectionSessions, function (err, result) {
      if (err && err.codeName !== "NamespaceExists") throw err;
      console.log("Collection :" + collectionSessions + " is ready");
    })
    this.db.createCollection(collectionName, function (err, result) {
      if (err && err.codeName !== "NamespaceExists") throw err;
      console.log("Collection :" + collectionName + " is ready");
    });
    this.db.createCollection(collectionHappiness, function (err, result) {
      if (err && err.codeName !== "NamespaceExists") throw err;
      console.log("Collection :" + collectionHappiness + " is ready");
    });
    this.db.createCollection(collectionVelocity, function (err, result) {
      if (err && err.codeName !== "NamespaceExists") throw err;
      console.log("Collection :" + collectionVelocity + " is ready");
    });
    this.db.createCollection(collectionTeamSettings, function (err, result) {
      if (err && err.codeName !== "NamespaceExists") throw err;
      console.log("Collection :" + collectionTeamSettings + " is ready");
    });
    this.db.collection(collectionLoginInfo).createIndex({ userName: 1 }, { unique: true });
    this.db.collection(collectionLoginInfo).createIndex({ emailId: 1 }, { unique: true, sparse: true });
    this.db.collection(collectionSessions).createIndex({ sessionHash: 1 }, { unique: true });
    this.db.collection(collectionSessions).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    this.db.collection(collectionTeamSettings).createIndex({ teamName: 1 }, { unique: true });
    console.log("database connection complete!!!");
    return this.db;
  }
  static async closeDB() {
    if (this.connection) {
      await this.connection.close();
    }
    console.log("DB closed");
  }
}

DBConnection.db = null;
DBConnection.connection = null;
DBConnection.url = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/";
DBConnection.options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
};

class DBClient {
  static sanitizeTeamConfiguration(teamConfiguration) {
    if (!teamConfiguration || !teamConfiguration.jira) {
      return { ...defaultTeamConfiguration };
    }

    return {
      jira: {
        enabled: Boolean(teamConfiguration.jira.enabled),
        boardUrl: teamConfiguration.jira.boardUrl || "",
        baseUrl: teamConfiguration.jira.baseUrl || "",
        boardId: teamConfiguration.jira.boardId || "",
        projectKey: teamConfiguration.jira.projectKey || "",
        userName: teamConfiguration.jira.userName || "",
        hasCredentials: Boolean(teamConfiguration.jira.apiTokenEncrypted),
      },
    };
  }

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
    const storedSettings = await DBConnection.db.collection(collectionName).findOne(dbQuery);
    if (!storedSettings) {
      return { ...defaultColumns, teamName: team };
    }
    return storedSettings;
  }

  static async getTeamConfiguration(teamName) {
    const teamConfiguration = await DBConnection.db
      .collection(collectionTeamSettings)
      .findOne({ teamName });

    return DBClient.sanitizeTeamConfiguration(teamConfiguration);
  }

  static async setTeamConfiguration(teamName, integration = {}) {
    const jiraConfig = integration.jira || {};
    const isJiraEnabled = Boolean(jiraConfig.enabled);

    return await DBConnection.db.collection(collectionTeamSettings).updateOne(
      { teamName },
      {
        $set: {
          teamName,
          jira: {
            enabled: isJiraEnabled,
            boardUrl: isJiraEnabled ? String(jiraConfig.boardUrl || "").trim() : "",
            baseUrl: isJiraEnabled ? String(jiraConfig.baseUrl || "").trim().replace(/\/+$/, "") : "",
            boardId: isJiraEnabled ? String(jiraConfig.boardId || "").trim() : "",
            projectKey: isJiraEnabled ? String(jiraConfig.projectKey || "").trim().toUpperCase() : "",
            userName: isJiraEnabled ? String(jiraConfig.userName || "").trim() : "",
            apiTokenEncrypted:
              isJiraEnabled && jiraConfig.apiToken
                ? encryptSecret(String(jiraConfig.apiToken))
                : "",
          },
        },
      },
      { upsert: true }
    );
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
    return await DBConnection.db.collection(collectionName).updateOne(
      settingsQuery,
      {
        $set: {
          [col]: value,
        },
        $setOnInsert: {
          ...defaultColumns,
          teamName,
        },
      },
      { upsert: true }
    );
  }

  static async applyColumnTemplate(teamName, columns) {
    let settingsQuery = {
      teamName,
      setting: "columns",
    };

    return await DBConnection.db.collection(collectionName).updateOne(
      settingsQuery,
      {
        $set: {
          teamName,
          setting: "columns",
          Good: columns.Good,
          Bad: columns.Bad,
          Ugly: columns.Ugly,
        },
      },
      { upsert: true }
    );
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

  static async createSession(userRecord) {
    const sessionToken = createSessionToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + sessionDurationInMs);

    await DBConnection.db.collection(collectionSessions).insertOne({
      _id: createIdentifier(),
      userId: userRecord._id,
      sessionHash: hashSessionToken(sessionToken),
      createdAt: now,
      expiresAt,
      lastSeenAt: now,
    });

    return sessionToken;
  }

  static async revokeSession(sessionToken) {
    if (!sessionToken) {
      return;
    }

    await DBConnection.db
      .collection(collectionSessions)
      .deleteOne({ sessionHash: hashSessionToken(sessionToken) });
  }

  static async getUserForSession(sessionToken) {
    if (!sessionToken) {
      return null;
    }

    const sessionRecord = await DBConnection.db
      .collection(collectionSessions)
      .findOne({ sessionHash: hashSessionToken(sessionToken) });

    if (!sessionRecord || new Date(sessionRecord.expiresAt).getTime() <= Date.now()) {
      return null;
    }

    const userRecord = await DBConnection.db
      .collection(collectionLoginInfo)
      .findOne({ _id: sessionRecord.userId });

    if (!userRecord) {
      return null;
    }

    await DBConnection.db.collection(collectionSessions).updateOne(
      { _id: sessionRecord._id },
      { $set: { lastSeenAt: new Date() } }
    );

    return normalizeUserRecord(userRecord);
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
          source: reqBody.source || "manual",
          jiraSprintId: reqBody.jiraSprintId || "",
          jiraSprintName: reqBody.jiraSprintName || "",
          syncedAt: reqBody.syncedAt || "",
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
    const piList = await DBConnection.db
      .collection(collectionVelocity)
      .distinct("pi", query);
    return piList.filter(Boolean);
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

  static async deleteSprint(teamName, sprintName) {
    await DBConnection.db.collection(collectionVelocity).deleteMany({
      team: teamName,
      sprint: sprintName,
    });
    await DBConnection.db.collection(collectionHappiness).deleteMany({
      team: teamName,
      sprint: sprintName,
    });
    return DBConnection.db.collection(collectionName).deleteMany({
      team: teamName,
      sprint: sprintName,
    });
  }

  static async deleteTeam(teamName) {
    await DBConnection.db.collection(collectionVelocity).deleteMany({
      team: teamName,
    });
    await DBConnection.db.collection(collectionHappiness).deleteMany({
      team: teamName,
    });
    await DBConnection.db.collection(collectionTeamSettings).deleteOne({
      teamName,
    });
    return DBConnection.db.collection(collectionName).deleteMany({
      team: teamName,
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
    let doesUserExits = await DBConnection.db.collection(collectionLoginInfo).findOne({
      $or: [{ userName: signUpData.userName }, { emailId: signUpData.emailId }],
    });

    if (doesUserExits) {
      return -1;
    }

    const userRecord = {
      _id: createIdentifier(),
      userName: signUpData.userName,
      emailId: signUpData.emailId,
      passwordHash: createPasswordHash(signUpData.password),
      role: signUpData.role || defaultUserRole,
      teams: signUpData.teams || defaultTeams,
      createdAt: new Date(),
    };

    let addUser = await DBConnection.db.collection(collectionLoginInfo).insertOne(userRecord);

    if (!addUser || !addUser.insertedId) {
      return -2;
    }

    return normalizeUserRecord(userRecord);
  }

  static async authenticate(loginData) {
    let userInfo = await DBConnection.db.collection(collectionLoginInfo).findOne({
      userName: loginData.userName,
    });

    const passwordHash = userInfo ? userInfo.passwordHash || userInfo.password : null;

    if (!userInfo || !verifyPassword(loginData.password, passwordHash)) {
      return -1;
    }

    return normalizeUserRecord(userInfo);
  }

  static async isSessionValid(userInfo, checkTeamName) {
    const authenticatedUser = await DBClient.getUserForSession(userInfo.sessionId);

    if (!authenticatedUser) {
      return false;
    }

    if (userInfo.userName && authenticatedUser.userName !== userInfo.userName) {
      return false;
    }

    return true;
  }
}

module.exports = {
  DBConnection,
  DBClient,
};
