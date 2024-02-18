import { UserSurveysDTO } from "../../../types/types";
import * as surveyRepository from "../../quizzes/data-access/survey-repository";

export const getUserSurveys = async (
  userId: string,
  page: number,
  sort: { column: string; type: "asc" | "desc" }
) => {
  const take = 30;
  const skip = (page - 1) * take;

  const [userSurveys, userSurveyCount] = await Promise.all([
    surveyRepository.getUserSurveys(take, skip, userId, sort),
    surveyRepository.getUserSurveyCount(userId),
  ]);

  const data: UserSurveysDTO = {
    data: userSurveys.map((survey) => ({
      id: survey.id,
      title: survey.title,
      creatorId: survey.creatorId,
      updated_at: survey.updated_at,
      created_at: survey.created_at,
      category: survey.category,
      question_count: survey._count.questions,
      responses_count: survey._count.surveyResponses,
      page_count: survey._count.surveyPages,
    })),
    total_pages: Math.ceil(userSurveyCount / take),
  };

  return data;
};

export const getUserSurveyCount = async (userId: string) => {
  return surveyRepository.getUserSurveyCount(userId);
};
