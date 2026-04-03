const JuryService = require("../services/juryService");
const ApiError = require("../utils/ApiError");
const formatResponse = require("../utils/formatResponse");
const { requireFields } = require("../utils/validators");

class JuryController {
  /** Создание члена жюри организатором */
  static async createJuryMember(req, res, next) {
    try {
      if (req.user.role !== "organizer") {
        throw new ApiError(403, "Only organizer can create jury members");
      }
      requireFields(req.body, ["contestId", "fullName", "email", "password"]);
      const data = await JuryService.createJuryMember({
        ...req.body,
        organizerId: req.user.id
      });
      return res.status(201).json(
        formatResponse(201, "Jury member created", {
          assignment: data.jury,
          user: {
            id: data.user.id,
            fullName: data.user.fullName,
            email: data.user.email,
            role: data.user.role
          }
        })
      );
    } catch (error) {
      return next(error);
    }
  }

  /** Список жюри по конкурсу */
  static async getJuryMembers(req, res, next) {
    try {
      const members = await JuryService.listJuryMembers(req.params.contestId);
      return res.status(200).json(formatResponse(200, "Jury list", members));
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = JuryController;
