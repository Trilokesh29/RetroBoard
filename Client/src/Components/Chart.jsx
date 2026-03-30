import React, { useEffect, useMemo, useState } from "react";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Select from "react-select";
import { Bar, Line } from "react-chartjs-2";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";

import Config from "../Configuration";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
);

const teamNameToIgnore = "http:";

function buildLiveAverage(values) {
  let runningTotal = 0;

  return values.map((value, index) => {
    runningTotal += Number(value || 0);
    return Number((runningTotal / (index + 1)).toFixed(2));
  });
}

function Chart({ teamName, sprints }) {
  const [allSprints, setAllSprints] = useState([]);
  const [visibleSprints, setVisibleSprints] = useState([]);
  const [piOptions, setPiOptions] = useState([]);
  const [selectedPi, setSelectedPi] = useState({ value: -1, label: "All PIs" });
  const [happinessStatus, setHappinessStatus] = useState("idle");
  const [velocityStatus, setVelocityStatus] = useState("idle");
  const [happinessChart, setHappinessChart] = useState(null);
  const [velocityChart, setVelocityChart] = useState(null);

  useEffect(() => {
    setAllSprints(Array.isArray(sprints) ? sprints : []);
    setVisibleSprints(Array.isArray(sprints) ? sprints : []);
  }, [sprints]);

  useEffect(() => {
    if (teamName === teamNameToIgnore) {
      setPiOptions([]);
      return;
    }

    Config.getAxiosInstance()
      .get("getPIListForATeam", {
        params: {
          userName: Config.getCurrentUserName(),
          team: teamName,
        },
      })
      .then((response) => {
        const options = [
          { value: -1, label: "All PIs" },
          ...response.data.map((pi) => ({
            value: pi,
            label: `PI ${pi}`,
          })),
        ];
        setPiOptions(options);
      });
  }, [teamName]);

  useEffect(() => {
    async function loadCharts() {
      if (teamName === teamNameToIgnore || !visibleSprints.length) {
        setHappinessChart(null);
        setVelocityChart(null);
        setHappinessStatus("empty");
        setVelocityStatus("empty");
        return;
      }

      setHappinessStatus("loading");
      setVelocityStatus("loading");

      const [happinessResults, velocityResults] = await Promise.all([
        Promise.all(
          visibleSprints.map(async (sprint) => {
            const response = await Config.getAxiosInstance().get("getAvgHappinessForASprint", {
              params: {
                userName: Config.getCurrentUserName(),
                team: teamName,
                sprint,
              },
            });

            return {
              sprint,
              average: Number(response.data.average),
            };
          })
        ),
        Promise.all(
          visibleSprints.map(async (sprint) => {
            const response = await Config.getAxiosInstance().get("getVelocityForSprint", {
              params: {
                userName: Config.getCurrentUserName(),
                team: teamName,
                sprint,
              },
            });

            return {
              sprint,
              velocity: response.data[0] || null,
            };
          })
        ),
      ]);

      const validHappiness = happinessResults.filter((entry) => !Number.isNaN(entry.average));
      const validVelocity = velocityResults.filter(
        (entry) => entry.velocity && Number(entry.velocity.spPlanned) > 0
      );

      if (validHappiness.length) {
        const labels = validHappiness.map((entry) => entry.sprint);
        const happinessValues = validHappiness.map((entry) => Number(entry.average));
        setHappinessChart({
          labels,
          datasets: [
            {
              label: "Happiness",
              data: happinessValues,
              borderColor: "#c96d45",
              backgroundColor: "rgba(201, 109, 69, 0.18)",
              tension: 0.35,
            },
            {
              label: "Live average",
              data: buildLiveAverage(happinessValues),
              borderColor: "#1f6f61",
              backgroundColor: "rgba(31, 111, 97, 0.12)",
              borderDash: [8, 6],
              tension: 0.3,
            },
          ],
        });
        setHappinessStatus("ready");
      } else {
        setHappinessChart(null);
        setHappinessStatus("empty");
      }

      if (validVelocity.length) {
        const labels = validVelocity.map((entry) => entry.sprint);
        const planned = validVelocity.map((entry) => Number(entry.velocity.spPlanned));
        const burnt = validVelocity.map((entry) => Number(entry.velocity.spBurnt));
        const accuracy = validVelocity.map((entry) => Number(entry.velocity.bbAccuracy));

        setVelocityChart({
          labels,
          datasets: [
            {
              type: "line",
              label: "Live average",
              data: buildLiveAverage(burnt),
              borderColor: "#1f6f61",
              backgroundColor: "#1f6f61",
              borderDash: [8, 6],
              tension: 0.3,
              yAxisID: "y",
            },
            {
              type: "bar",
              label: "SP committed",
              data: planned,
              backgroundColor: "rgba(109, 90, 68, 0.55)",
              borderRadius: 12,
              yAxisID: "y",
            },
            {
              type: "bar",
              label: "SP burned",
              data: burnt,
              backgroundColor: "rgba(31, 111, 97, 0.74)",
              borderRadius: 12,
              yAxisID: "y",
            },
            {
              type: "line",
              label: "BB accuracy (%)",
              data: accuracy,
              borderColor: "#ffcd6b",
              backgroundColor: "#ffcd6b",
              yAxisID: "y1",
            },
          ],
        });
        setVelocityStatus("ready");
      } else {
        setVelocityChart(null);
        setVelocityStatus("empty");
      }
    }

    loadCharts();
  }, [teamName, visibleSprints]);

  const commonOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    }),
    []
  );

  async function handlePiSelection(option) {
    setSelectedPi(option);

    if (!option || option.value === -1) {
      setVisibleSprints(allSprints);
      return;
    }

    const response = await Config.getAxiosInstance().get("getSprintsForAPI", {
      params: {
        userName: Config.getCurrentUserName(),
        team: teamName,
        pi: option.value,
      },
    });

    setVisibleSprints(response.data || []);
  }

  if (teamName === teamNameToIgnore) {
    return <h2>Select a team to proceed</h2>;
  }

  if (!allSprints.length) {
    return <h2>Create a sprint to unlock trend charts</h2>;
  }

  return (
    <Container fluid>
      <Row>
        <Col lg="6">
          <div className="chart-panel">
            {happinessStatus === "ready" && happinessChart ? (
              <Line
                data={happinessChart}
                options={{
                  ...commonOptions,
                  plugins: {
                    ...commonOptions.plugins,
                    title: {
                      display: true,
                      text: `Happiness trend for ${teamName}`,
                    },
                  },
                  scales: {
                    y: {
                      suggestedMin: 1,
                      suggestedMax: 5,
                    },
                  },
                }}
              />
            ) : happinessStatus === "loading" ? (
              <h2>Happiness trend is loading...</h2>
            ) : (
              <h2>No sprint with valid happiness information</h2>
            )}
          </div>
        </Col>
        <Col lg="6">
          <div className="chart-panel">
            {velocityStatus === "ready" && velocityChart ? (
              <Bar
                data={velocityChart}
                options={{
                  ...commonOptions,
                  plugins: {
                    ...commonOptions.plugins,
                    title: {
                      display: true,
                      text: `Velocity trend for ${teamName}`,
                    },
                  },
                  scales: {
                    y: {
                      position: "left",
                      beginAtZero: true,
                    },
                    y1: {
                      position: "right",
                      beginAtZero: true,
                      grid: {
                        drawOnChartArea: false,
                      },
                    },
                  },
                }}
              />
            ) : velocityStatus === "loading" ? (
              <h2>Velocity chart is loading...</h2>
            ) : (
              <h2>No sprint with valid velocity information</h2>
            )}
          </div>

          {piOptions.length > 1 ? (
            <div style={{ marginTop: 18 }}>
              <Select
                placeholder="Filter by PI"
                value={selectedPi}
                onChange={handlePiSelection}
                options={piOptions}
              />
            </div>
          ) : null}
        </Col>
      </Row>
    </Container>
  );
}

export default Chart;
