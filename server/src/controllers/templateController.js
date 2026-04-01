const templateService = require("../services/templateService");
const formatResponse = require("../utils/formatResponse");

function getTemplates(_req, res) {
  const templates = templateService.getTemplates();
  return res.status(200).json(formatResponse(200, "Templates list", templates));
}

module.exports = {
  getTemplates
};
