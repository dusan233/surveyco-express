import { Request } from "express";

export function randomizeArray<T>(array: T[]): T[] {
  const newArray = [...array];

  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }

  return newArray;
}

export const getSavedSurveyResponsesFromCookies = (signedCookies: {
  [key: string]: string;
}) => {
  if (signedCookies && signedCookies.surveyResponses) {
    const surveyResponses: {
      id: string;
      surveyId: string;
      collectorId: string;
      submitted: boolean;
    }[] = JSON.parse(signedCookies.surveyResponses);

    return surveyResponses;
  }

  return [];
};
