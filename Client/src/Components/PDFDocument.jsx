import React from "react";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import Config from "../Configuration";
import logo from "../PDF_Renderer_Assets/Images/TT_Logo2019_RGB_75_minWht.png";
import lightFont from "../PDF_Renderer_Assets/Fonts/Roboto/Roboto-Light.ttf";
import regularFont from "../PDF_Renderer_Assets/Fonts/Roboto/Roboto-Regular.ttf";
import boldFont from "../PDF_Renderer_Assets/Fonts/Roboto/Roboto-Bold.ttf";

Font.register({ family: "Roboto", src: lightFont, fontWeight: 300 });
Font.register({ family: "Roboto", src: regularFont, fontWeight: 400 });
Font.register({ family: "Roboto", src: boldFont, fontWeight: 700 });

const currentDate = new Date();
let goodItems = [];
let badItems = [];
let uglyItems = [];
let columnNames;

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#FFFFFF",
    fontFamily: "Roboto",
    fontSize: 9,
    padding: 24,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerInfo: {
    flexGrow: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: 300,
    marginBottom: 2,
  },
  date: {
    fontSize: 7,
    fontWeight: 300,
  },
  logo: {
    height: 32,
    objectFit: "contain",
    width: 120,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 6,
  },
  table: {
    borderColor: "#D5DAE5",
    borderStyle: "solid",
    borderWidth: 1,
  },
  headerRow: {
    backgroundColor: "#EEF4FF",
  },
  row: {
    borderTopColor: "#D5DAE5",
    borderTopStyle: "solid",
    borderTopWidth: 1,
    flexDirection: "row",
  },
  cell: {
    minHeight: 24,
    padding: 6,
  },
  commentCell: {
    width: "42%",
  },
  votesCell: {
    textAlign: "center",
    width: "16%",
  },
  actionCell: {
    width: "42%",
  },
  headerCellText: {
    fontSize: 9,
    fontWeight: 700,
    textAlign: "center",
  },
  bodyCellText: {
    fontSize: 8,
    fontWeight: 300,
  },
  footer: {
    bottom: 18,
    fontSize: 7,
    left: 24,
    position: "absolute",
    right: 24,
    textAlign: "center",
  },
});

function getColumnTitle(key, fallbackTitle) {
  const configuredTitle = columnNames?.[key];
  return configuredTitle
    ? configuredTitle.replace(/[\r\n]+/gm, "").trim()
    : fallbackTitle;
}

function getActionPointsText(item) {
  if (!item.actionPoints || item.actionPoints.length === 0) {
    return "None";
  }

  return item.actionPoints
    .map((actionPoint, index) => `${index + 1}. ${actionPoint}`)
    .join("\n");
}

function ColumnTable({ title, items }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.table}>
        <View style={[styles.row, styles.headerRow]}>
          <View style={[styles.cell, styles.commentCell]}>
            <Text style={styles.headerCellText}>Comment</Text>
          </View>
          <View style={[styles.cell, styles.votesCell]}>
            <Text style={styles.headerCellText}>Votes</Text>
          </View>
          <View style={[styles.cell, styles.actionCell]}>
            <Text style={styles.headerCellText}>Action Points</Text>
          </View>
        </View>
        {items.map((item) => (
          <View key={item._id || `${item.message}-${item.date}`} style={styles.row}>
            <View style={[styles.cell, styles.commentCell]}>
              <Text style={styles.bodyCellText}>{item.message || ""}</Text>
            </View>
            <View style={[styles.cell, styles.votesCell]}>
              <Text style={styles.bodyCellText}>{String(item.votes ?? 0)}</Text>
            </View>
            <View style={[styles.cell, styles.actionCell]}>
              <Text style={styles.bodyCellText}>{getActionPointsText(item)}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const MyDocument = () => (
  <Document>
    <Page size="A4" style={styles.page} wrap>
      <View style={styles.header} fixed>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>Retrospective</Text>
          <Text style={styles.subtitle}>Sprint: {Config.getSprintName()}</Text>
          <Text style={styles.subtitle}>Team: {Config.getTeamName()}</Text>
          <Text style={styles.date}>Report date: {currentDate.toDateString()}</Text>
        </View>
        <Image style={styles.logo} src={logo} />
      </View>

      <ColumnTable title={getColumnTitle("Good", "Good")} items={goodItems} />
      <ColumnTable title={getColumnTitle("Bad", "Bad")} items={badItems} />
      <ColumnTable title={getColumnTitle("Ugly", "Ugly")} items={uglyItems} />

      <Text style={styles.footer} fixed>
        Copyright {"\u00A9"} {currentDate.getFullYear()} TomTom N.V. All rights reserved.
      </Text>
    </Page>
  </Document>
);

const UpdateData = async (list1, list2, list3, settings) => {
  goodItems = Array.isArray(list1) ? list1 : [];
  badItems = Array.isArray(list2) ? list2 : [];
  uglyItems = Array.isArray(list3) ? list3 : [];
  columnNames = settings;
};

const GeneratePDF = async (filename) => {
  const blob = await pdf(<MyDocument />).toBlob();
  saveAs(blob, filename);
};

export default MyDocument;
export { MyDocument, GeneratePDF, UpdateData };
