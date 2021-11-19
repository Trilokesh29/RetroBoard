import React, { Component } from "react";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import { Bar, Line } from "react-chartjs-2";
import Select from "react-select";

import Config from "../Configuration";

const teamNameToIgnore = "http:";
const statusComplete = "complete";
const statusLoading = "loading";
const statusStart = "start";
const statusIncomplete = "incomplete";

var invalidVelocityDataCount = 0;
var invalidHappinessDataCount = 0;
var currentPISelectedValue = -1;

class Chart extends Component {
  constructor(props) {
    super(props);
    this.state = {
      pis: [],
      selectedOption: null,
      isPIsLoaded: statusStart,
      sprints: [],
      Happiness: {
        labels: [],
        datasets: [
          {
            label: "Happiness",
            type: "line",
            fill: false,
            backgroundColor: "red",
            borderColor: "purple",
            pointHitRadius: 10,
            data: [], // avg happiness per sprint
          },
          {
            label: "Live Average",
            type: "line",
            fill: false,
            borderCapStyle: "square",
            backgroundColor: "blue",
            pointBorderColor: "blue",
            borderColor: "orange",
            borderDash: [12, 5],
            pointHitRadius: 10,
            pointStyle: "rectRounded",
            data: [], // live avg happiness
          },
        ],
        options: {
          responsive: true,
          tooltips: {
            mode: "label",
          },
          title: {
            display: true,
            text: "Happiness Trend For `" + this.props.teamName + "`",
            fontFamily: "Roboto",
            fontSize: 15,
          },
          scales: {
            yAxes: [
              {
                ticks: {
                  // suggestedMin: 2,
                },
              },
            ],
          },
          maintainAspectRatio: false,
        },
        isHappinessLoaded: statusStart,
      },
      Velocity: {
        datasets: [
          {
            label: "Live Average",
            type: "line",
            data: [], // average to be computed
            fill: false,
            borderColor: "#71B34A",
            backgroundColor: "#71B34A",
            pointBorderColor: "#71B34A",
            pointBackgroundColor: "#71B34A",
            pointHoverBackgroundColor: "#71B34A",
            pointHoverBorderColor: "#71B34A",
            borderDash: [12, 5],
            yAxisID: "y-axis-1",
          },
          {
            type: "bar",
            label: "SP Commited",
            data: [], // sp planned fetched from database
            fill: false,
            backgroundColor: "grey",
            borderColor: "grey",
            hoverBackgroundColor: "grey",
            hoverBorderColor: "grey",
            yAxisID: "y-axis-1",
          },
          {
            type: "bar",
            label: "SP Burned",
            data: [], // sp burned fetched from database
            fill: false,
            backgroundColor: "#51A37D",
            borderColor: "#51A37D",
            hoverBackgroundColor: "#51A37D",
            hoverBorderColor: "#51A37D",
            yAxisID: "y-axis-1",
          },
          {
            type: "line",
            data: [], // Bug buffer accuracy
            label: "BB Accuracy (%)",
            yAxisID: "y-axis-2",
            pointRadius: 0,
            showLine: false,
          },
        ],
        options: {
          responsive: true,
          title: {
            display: true,
            text: "Velocity Trend For `" + this.props.teamName + "`",
            fontFamily: "Roboto",
            fontSize: 15,
          },
          labels: [], // this is the sprint list
          tooltips: {
            mode: "label",
          },
          elements: {
            line: {
              fill: false,
            },
          },

          scales: {
            xAxes: [
              {
                display: true,
                ticks: { suggestedMin: 0, maxTicksLimit: 20 },
                gridLines: {
                  display: false,
                },
                labels: [], // this is the sprint list
              },
            ],
            yAxes: [
              {
                type: "linear",
                display: true,
                ticks: {
                  suggestedMin: 0,
                  maxTicksLimit: 10,
                },
                position: "left",
                id: "y-axis-1",
                gridLines: {
                  display: false,
                },
                labels: {
                  show: true,
                },
              },
              {
                type: "linear",
                display: false,
                ticks: { suggestedMin: 0, maxTicksLimit: 20 },
                position: "right",
                id: "y-axis-2",
                gridLines: {
                  display: false,
                },
                labels: {
                  show: false,
                },
              },
            ],
          },
        },
        isVelocityLoaded: statusStart,
      },
    };
  }

  componentDidMount = async () => {
    let sprints = await this.props.sprints;
    this.setState({ sprints: sprints });
    let teamName = this.props.teamName;
    this.updatePIList(teamName, sprints);
    this.updateHapinessList(teamName, sprints);
    this.updateVelocityList(teamName, sprints);
  };

  handleSelection = async (selectedOption) => {
    // show all the data without filter
    if (currentPISelectedValue !== selectedOption.value) {
      if (selectedOption.value === -1) {
        let sprints = await this.props.sprints;
        this.updateVelocityList(this.props.teamName, sprints);
        this.updateHapinessList(this.props.teamName, sprints);

      } else {
        let reqData = {
          params: {
            userName: localStorage.getItem("userName"),
            sessionId: localStorage.getItem("sessionId"),
            team: this.props.teamName,
            pi: selectedOption.value,
          },
        };

        Config.getAxiosInstance()
          .get("getSprintsForAPI", reqData)
          .then((sprints) => {
            this.updateHapinessList(this.props.teamName, sprints.data)
            this.updateVelocityList(this.props.teamName, sprints.data)
          });
      }

      currentPISelectedValue = selectedOption.value;
    }
  };

  getAvgHappiness = async (reqData) => {
    let result = await Config.getAxiosInstance().get(
      "getAvgHappinessForASprint",
      reqData
    );
    return result.data.average;
  };

  getSPInfoForASprint = async (reqData) => {
    let result = await Config.getAxiosInstance().get(
      "getVelocityForSprint",
      reqData
    );

    return result.data[0];
  };

  updatePIList = async (teamName) => {
    if (teamName !== teamNameToIgnore) {
      let reqData = {
        params: {
          userName: localStorage.getItem("userName"),
          sessionId: localStorage.getItem("sessionId"),
          team: teamName,
        },
      };
      let temp = {
        value: -1,
        label: "ALL",
      };

      this.state.pis.push(temp);
      Config.getAxiosInstance()
        .get("getPIListForATeam", reqData)
        .then((pis) => {
          pis.data.forEach((pi) => {
            let temp = {
              value: pi,
              label: "PI_" + pi,
            };

            this.state.pis.push(temp);
          });
        })
        .then(() => {
          if (this.state.pis.length > 1) {
            this.SortPIList();
            this.setState({ isPIsLoaded: statusComplete });
          }
        });
    }
  };

  SortPIList() {
    let piList = JSON.parse(JSON.stringify(this.state.pis));
    piList = piList.sort(function (a, b) {
      return a.value - b.value;
    });

    this.setState({
      pis: piList,
    });
  }

  cleanUP() {
    // this is safe in this case because we are not using state to render
    this.state.Velocity.options.labels.length = 0;
    this.state.Velocity.datasets[0].data.length = 0;
    this.state.Velocity.datasets[1].data.length = 0;
    this.state.Velocity.datasets[2].data.length = 0;
    
    this.state.Happiness.labels.length = 0;
    this.state.Happiness.datasets[0].data.length = 0;
    this.state.Happiness.datasets[1].data.length = 0;
  }

  updateVelocityList = async (teamName, sprints) => {
    if (teamName !== teamNameToIgnore && sprints.length) {
      this.cleanUP();
      invalidVelocityDataCount = 0;
      this.setState({ isVelocityLoaded: statusLoading });

      sprints.forEach(async (sprint, index) => {
        let reqObj = {
          params: {
            userName: localStorage.getItem("userName"),
            sessionId: localStorage.getItem("sessionId"),
            team: teamName,
            sprint: sprint,
          },
        };

        let spInfo = await this.getSPInfoForASprint(reqObj);

        // dataset[0] -> average
        // dataset[1] -> SP Planned
        // dataset[2] -> SP Burned
        // dataset[3] -> BB Accuracy

        if (spInfo && spInfo.spPlanned > 0) {
          // check if a new PI is added
          const found = this.state.pis.some((el) => el.value === spInfo.pi);

          if (!found) {
            let temp = {
              value: spInfo.pi,
              label: "PI_" + spInfo.pi,
            };
            this.state.pis.push(temp);
            this.SortPIList();
            this.setState({ isPIsLoaded: statusComplete });
          }

          let Velocity = JSON.parse(JSON.stringify(this.state.Velocity));

          Velocity.options.labels[index] = sprint;
          Velocity.options.scales.xAxes[0].labels[index] = sprint;

          Velocity.datasets[1].data[index] = spInfo.spPlanned;
          Velocity.datasets[2].data[index] = spInfo.spBurnt;
          Velocity.datasets[3].data[index] = spInfo.bbAccuracy;

          this.setState({ Velocity: Velocity });
        } else {
          invalidVelocityDataCount++;
        }

        if (
          sprints.length &&
          invalidVelocityDataCount !== sprints.length &&
          sprints.length ===
          this.state.Velocity.datasets[2].data.filter(Boolean).length +
          invalidVelocityDataCount
        ) {
          let Velocity = JSON.parse(JSON.stringify(this.state.Velocity));

          // remove empty element if any. Empty element is due to some sprints not having SP info. This is to align the array

          Velocity.options.scales.xAxes[0].labels = Velocity.options.labels = Velocity.options.labels.filter(
            function (el) {
              return el != null;
            }
          );

          Velocity.datasets[1].data = Velocity.datasets[1].data.filter(
            function (el) {
              return el != null;
            }
          );

          Velocity.datasets[2].data = Velocity.datasets[2].data.filter(
            function (el) {
              return el != null;
            }
          );
          Velocity.datasets[3].data = Velocity.datasets[3].data.filter(
            function (el) {
              return el != null;
            }
          );

          this.setState({ Velocity: Velocity });

          this.state.Velocity.options.labels.forEach((sprint, index) => {
            let avgVelocity = 0;
            let totalSPBurnt = 0;

            for (let startIndex = 0; startIndex <= index; startIndex++) {
              totalSPBurnt += parseInt(
                this.state.Velocity.datasets[2].data[startIndex],
                10
              );
            }

            avgVelocity = parseFloat(totalSPBurnt / (index + 1)).toFixed(2);

            let Velocity = JSON.parse(JSON.stringify(this.state.Velocity));

            Velocity.datasets[0].data[index] = avgVelocity;

            this.setState({ Velocity: Velocity });
          });

          this.setState({ isVelocityLoaded: statusComplete });
        } else if (invalidVelocityDataCount === sprints.length) {
          this.setState({ isVelocityLoaded: statusIncomplete });
        }
      });
    }
  };

  updateHapinessList = async (teamName, sprints) => {
    if (teamName !== teamNameToIgnore && sprints.length) {
      invalidHappinessDataCount = 0;

      sprints.forEach(async (sprint, index) => {
        this.setState({ isHappinessLoaded: statusLoading });

        let jsonObj = {
          params: {
            userName: localStorage.getItem("userName"),
            sessionId: localStorage.getItem("sessionId"),
            team: teamName,
            sprint: sprint,
          },
        };

        let happiness = await this.getAvgHappiness(jsonObj);

        if (!isNaN(happiness)) {
          let Happiness = JSON.parse(JSON.stringify(this.state.Happiness));
          Happiness.labels[index] = sprint;
          Happiness.datasets[0].data[index] = happiness;

          this.setState({ Happiness: Happiness });
        } else {
          invalidHappinessDataCount++;
        }

        if (
          sprints.length &&
          sprints.length !== invalidHappinessDataCount &&
          sprints.length ===
          this.state.Happiness.datasets[0].data.filter(Boolean).length +
          invalidHappinessDataCount
        ) {
          // this is to remove null from the array
          let Happiness = JSON.parse(JSON.stringify(this.state.Happiness));
          Happiness.labels = Happiness.labels.filter(function (el) {
            return el != null;
          });

          // this is to remove null from the array
          Happiness.datasets[0].data = Happiness.datasets[0].data.filter(
            function (el) {
              return el != null;
            }
          );

          Happiness.labels.forEach((sprint, curIndex) => {
            let liveAvgHappiness = 0;
            let sumHappiness = 0;

            for (let startIndex = 0; startIndex <= curIndex; startIndex++) {
              sumHappiness += parseFloat(
                Happiness.datasets[0].data[startIndex],
                10
              );
            }

            liveAvgHappiness = parseFloat(
              sumHappiness / (curIndex + 1)
            ).toFixed(2);

            Happiness.datasets[1].data[curIndex] = liveAvgHappiness;
          });

          this.setState({ Happiness: Happiness });

          this.setState({
            isHappinessLoaded: statusComplete,
          });
        } else if (sprints.length === invalidHappinessDataCount) {
          this.setState({ isHappinessLoaded: statusIncomplete });
        }
      });
    }
  };

  DecideTheText() {
    if (this.props.teamName === teamNameToIgnore) {
      return (
        <div>
          {" "}
          <h2> Select A Team To Proceed </h2>{" "}
        </div>
      );
    } else if (
      this.props.teamName !== teamNameToIgnore &&
      !this.state.sprints.length
    ) {
      return (
        <div>
          {" "}
          <h2> Create Sprint To Proceed </h2>{" "}
        </div>
      );
    }
  }

  render() {
    return (
      <Container fluid>
        <Row>
          <Col lg="6">
            <div>
              {" "}
              {this.state.isHappinessLoaded === statusComplete ? (
                <Line
                  ref="chart"
                  data={this.state.Happiness}
                  height={300}
                  options={this.state.Happiness.options}
                />
              ) : this.state.isHappinessLoaded === statusIncomplete ? (
                <div>
                  {" "}
                  <h2> No Sprint With Valid Happiness Information </h2>{" "}
                </div>
              ) : this.state.isHappinessLoaded === statusLoading ? (
                <div>
                  {" "}
                  <h2> Happiness Trend Is Loading... </h2>{" "}
                </div>
              ) : (
                      this.DecideTheText()
                    )}{" "}
            </div>{" "}
          </Col>{" "}
          <Col lg>
            {" "}
            <div>
              {" "}
              {this.state.isVelocityLoaded === statusComplete ? (
                <Bar
                  data={this.state.Velocity}
                  options={this.state.Velocity.options}
                />
              ) : this.state.isVelocityLoaded === statusIncomplete ? (
                <div>
                  {" "}
                  <h2> No Sprint With Valid SP Data </h2>{" "}
                </div>
              ) : this.state.isVelocityLoaded === statusLoading ? (
                <div>
                  {" "}
                  <h2> Velocity Chart Loading... </h2>{" "}
                </div>
              ) : (
                      <div> {} </div>
                    )}{" "}
            </div>{" "}
            {this.state.isPIsLoaded === statusComplete ? (
              <Select
                placeholder="Select PI To Filter"
                value={this.selectedOption}
                onChange={this.handleSelection}
                options={this.state.pis}
              ></Select>
            ) : (
                <div> {} </div>
              )}{" "}
          </Col>{" "}
        </Row>{" "}
      </Container>
    );
  }
}

export default Chart;
