import * as surveyRepository from "../data-access/survey-repository";

export const getSurvey = async (surveyId: string) => {
  return await surveyRepository.getSurveyById(surveyId);
};
