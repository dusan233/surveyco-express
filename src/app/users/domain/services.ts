import { UserSurveysDTO } from "../../../types/types";
import * as userRepository from "../data-access/user-repository";

export const getUserSurveys = async (
  userId: string,
  page: number,
  sort: { column: string; type: "asc" | "desc" }
) => {
  const take = 30;
  const skip = (page - 1) * take;

  const [userSurveys, userSurveyCount] = await Promise.all([
    userRepository.getUserSurveys(take, skip, userId, sort),
    userRepository.getUserSurveyCount(userId),
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
  return userRepository.getUserSurveyCount(userId);
};
