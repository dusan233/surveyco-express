import * as questionResponseRepository from "../data-access/question-response-repository";

export const getQuestionResponses = async (
  surveyResponseId: string,
  questionIds: string[]
) => {
  return await questionResponseRepository.getQuestionResponsesBySurveyResponseId(
    surveyResponseId,
    questionIds
  );
};
