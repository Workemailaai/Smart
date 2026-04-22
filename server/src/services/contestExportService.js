const ExcelJS = require("exceljs");
const ContestService = require("./contestService");
const ApiError = require("../utils/ApiError");

function formatScoreValue(value) {
  if (value == null) return "—";
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return "—";
  return Number(normalized.toFixed(2));
}

function autosizeColumns(worksheet) {
  worksheet.columns.forEach((column) => {
    let maxLength = 10;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const currentValue = cell.value == null ? "" : String(cell.value);
      maxLength = Math.max(maxLength, currentValue.length + 2);
    });
    column.width = Math.min(48, maxLength);
  });
}

function sanitizeSheetName(value, fallback) {
  const rawName = String(value || "").trim() || fallback;
  const sanitized = rawName.replace(/[\\/*?:[\]]/g, "_");
  return sanitized.slice(0, 31) || fallback;
}

function addTableTitle(worksheet, rowIndex, title) {
  worksheet.getCell(rowIndex, 1).value = title;
  worksheet.getCell(rowIndex, 1).font = { bold: true };
  return rowIndex + 1;
}

function addTableHeader(worksheet, rowIndex, headers) {
  worksheet.getRow(rowIndex).values = ["", ...headers];
  worksheet.getRow(rowIndex).font = { bold: true };
  return rowIndex + 1;
}

class ContestExportService {
  static getCriterionPriorityRows(criteria, criterionOrderIds) {
    const criteriaById = new Map(criteria.map((criterion) => [criterion.id, criterion]));
    const orderedRows = [];
    const seenIds = new Set();
    if (Array.isArray(criterionOrderIds)) {
      for (const rawId of criterionOrderIds) {
        const criterionId = Number(rawId);
        const criterion = criteriaById.get(criterionId);
        if (!criterion || seenIds.has(criterionId)) continue;
        orderedRows.push(criterion);
        seenIds.add(criterionId);
      }
    }
    for (const criterion of criteria) {
      if (!seenIds.has(criterion.id)) orderedRows.push(criterion);
    }
    return orderedRows;
  }

  static async buildExportView({ contestId, userId }) {
    const organizerView = await ContestService.getOrganizerContestView({ contestId, userId });
    const contestWithDependencies = await ContestService.getContestWithDependencies(contestId);
    if (contestWithDependencies.status !== ContestService.contestStatuses.completed) {
      throw new ApiError(422, "Экспорт доступен только после завершения мероприятия");
    }

    const criteria = contestWithDependencies.criteria.map((criterion) => criterion.get({ plain: true }));
    const participants = contestWithDependencies.participants.map((participant) => participant.get({ plain: true }));
    const juryMembers = contestWithDependencies.juryMembers.map((juryMember) => ({
      id: juryMember.id,
      displayName: juryMember.displayName || juryMember.user?.fullName || "Жюри",
      phone: juryMember.user?.phone || "",
      criterionOrder: Array.isArray(juryMember.criterionOrder) ? juryMember.criterionOrder.map((id) => Number(id)) : []
    }));

    const rankedParticipants = [...organizerView.participants]
      .sort((leftParticipant, rightParticipant) => {
        const leftAverage = Number(leftParticipant.overallAverage || 0);
        const rightAverage = Number(rightParticipant.overallAverage || 0);
        if (rightAverage !== leftAverage) return rightAverage - leftAverage;
        return leftParticipant.id - rightParticipant.id;
      })
      .map((participant, index) => ({
        participantId: participant.id,
        fullName: participant.fullName,
        overallAverage: Number(participant.overallAverage || 0),
        rank: index + 1
      }));

    return {
      contest: organizerView.contest,
      criteria,
      participants,
      juryMembers,
      organizerParticipants: organizerView.participants,
      rankedParticipants
    };
  }

  static createWorkbook(exportView) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "BeautyEvents";
    workbook.created = new Date();

    const {
      contest,
      criteria,
      participants,
      juryMembers,
      organizerParticipants,
      rankedParticipants
    } = exportView;

    const organizerParticipantById = new Map(organizerParticipants.map((participant) => [participant.id, participant]));

    const summarySheet = workbook.addWorksheet("ИТОГОВЫЙ РЕЙТИНГ");
    let rowIndex = 1;

    rowIndex = addTableTitle(summarySheet, rowIndex, "Таблица 1. Итоговый рейтинг");
    const summaryHeaders = [
      "Участник",
      "Общая оценка",
      "Место в рейтинге",
      ...juryMembers.map((juryMember) => juryMember.displayName)
    ];
    rowIndex = addTableHeader(summarySheet, rowIndex, summaryHeaders);
    for (const rankedParticipant of rankedParticipants) {
      const participantCard = organizerParticipantById.get(rankedParticipant.participantId);
      const totalsByJuryId = new Map(
        (participantCard?.juryCards || []).map((juryCard) => [juryCard.juryId, formatScoreValue(juryCard.total)])
      );
      const rowValues = [
        rankedParticipant.fullName,
        formatScoreValue(rankedParticipant.overallAverage),
        rankedParticipant.rank,
        ...juryMembers.map((juryMember) => totalsByJuryId.get(juryMember.id) ?? "—")
      ];
      summarySheet.getRow(rowIndex).values = ["", ...rowValues];
      rowIndex += 1;
    }

    rowIndex += 1;
    rowIndex = addTableTitle(summarySheet, rowIndex, "Таблица 2. Флаги настроек конкурса");
    summarySheet.getRow(rowIndex).values = ["", `Значимость показателей: ${contest.useCriteriaWeights ? "Да" : "Нет"}`];
    rowIndex += 1;
    summarySheet.getRow(rowIndex).values = ["", `Учитывать предпочтения жюри: ${contest.juryPreferencesEnabled ? "Да" : "Нет"}`];
    rowIndex += 2;

    rowIndex = addTableTitle(summarySheet, rowIndex, "Таблица 3. Показатели оценивания");
    rowIndex = addTableHeader(summarySheet, rowIndex, ["Показатель"]);
    for (const criterion of criteria) {
      summarySheet.getRow(rowIndex).values = ["", criterion.name];
      rowIndex += 1;
    }

    rowIndex += 1;
    rowIndex = addTableTitle(summarySheet, rowIndex, "Таблица 4. Участники");
    rowIndex = addTableHeader(summarySheet, rowIndex, ["Список участников", "Доп. информация (страна)", "Доп. информация"]);
    for (const participant of participants) {
      summarySheet.getRow(rowIndex).values = [
        "",
        participant.fullName,
        participant.country || "",
        participant.extraInfo || ""
      ];
      rowIndex += 1;
    }

    rowIndex += 1;
    rowIndex = addTableTitle(summarySheet, rowIndex, "Таблица 5. Жюри");
    rowIndex = addTableHeader(summarySheet, rowIndex, ["Список жюри", "Телефон"]);
    for (const juryMember of juryMembers) {
      summarySheet.getRow(rowIndex).values = ["", juryMember.displayName, juryMember.phone];
      rowIndex += 1;
    }
    autosizeColumns(summarySheet);

    const criteriaSheet = workbook.addWorksheet("Оценки по показателям");
    let criteriaSheetRowIndex = 1;
    for (const criterion of criteria) {
      criteriaSheetRowIndex = addTableTitle(
        criteriaSheet,
        criteriaSheetRowIndex,
        `Показатель: ${criterion.name}`
      );
      const criterionHeaders = ["№ участника", ...juryMembers.map((juryMember) => juryMember.displayName)];
      criteriaSheetRowIndex = addTableHeader(criteriaSheet, criteriaSheetRowIndex, criterionHeaders);
      for (const participant of participants) {
        const participantCard = organizerParticipantById.get(participant.id);
        const rowValues = [
          participant.fullName,
          ...juryMembers.map((juryMember) => {
            const juryCard = participantCard?.juryCards?.find((card) => card.juryId === juryMember.id);
            const criterionScore = juryCard?.criteria?.find((item) => item.criterionId === criterion.id);
            return formatScoreValue(criterionScore?.value);
          })
        ];
        criteriaSheet.getRow(criteriaSheetRowIndex).values = ["", ...rowValues];
        criteriaSheetRowIndex += 1;
      }
      criteriaSheetRowIndex += 2;
    }
    autosizeColumns(criteriaSheet);

    juryMembers.forEach((juryMember, juryIndex) => {
      const fallbackName = `Жюри_${juryIndex + 1}`;
      const sheetName = sanitizeSheetName(juryMember.phone, fallbackName);
      const jurySheet = workbook.addWorksheet(sheetName);
      let jurySheetRowIndex = 1;

      jurySheetRowIndex = addTableTitle(jurySheet, jurySheetRowIndex, `Оценки эксперта: ${juryMember.displayName}`);
      const firstTableHeaders = ["Перечень показателей", ...participants.map((participant) => participant.fullName)];
      jurySheetRowIndex = addTableHeader(jurySheet, jurySheetRowIndex, firstTableHeaders);

      for (const criterion of criteria) {
        const rowValues = [criterion.name];
        for (const participant of participants) {
          const participantCard = organizerParticipantById.get(participant.id);
          const juryCard = participantCard?.juryCards?.find((card) => card.juryId === juryMember.id);
          const criterionScore = juryCard?.criteria?.find((item) => item.criterionId === criterion.id);
          rowValues.push(formatScoreValue(criterionScore?.value));
        }
        jurySheet.getRow(jurySheetRowIndex).values = ["", ...rowValues];
        jurySheetRowIndex += 1;
      }

      const totalRowValues = ["Итоговая оценка"];
      for (const participant of participants) {
        const participantCard = organizerParticipantById.get(participant.id);
        const juryCard = participantCard?.juryCards?.find((card) => card.juryId === juryMember.id);
        totalRowValues.push(formatScoreValue(juryCard?.total));
      }
      jurySheet.getRow(jurySheetRowIndex).values = ["", ...totalRowValues];
      jurySheet.getRow(jurySheetRowIndex).font = { bold: true };
      jurySheetRowIndex += 2;

      jurySheetRowIndex = addTableTitle(jurySheet, jurySheetRowIndex, "Значимость показателей");
      jurySheet.getRow(jurySheetRowIndex).values = ["", "Список показателей в порядке приоритетов конкретного эксперта"];
      jurySheetRowIndex += 1;
      const priorityCriteria = ContestExportService.getCriterionPriorityRows(criteria, juryMember.criterionOrder);
      for (const criterion of priorityCriteria) {
        jurySheet.getRow(jurySheetRowIndex).values = ["", criterion.name];
        jurySheetRowIndex += 1;
      }
      autosizeColumns(jurySheet);
    });

    return workbook;
  }

  static async generateContestWorkbookBuffer({ contestId, userId }) {
    const exportView = await ContestExportService.buildExportView({ contestId, userId });
    const workbook = ContestExportService.createWorkbook(exportView);
    return workbook.xlsx.writeBuffer();
  }
}

module.exports = ContestExportService;
