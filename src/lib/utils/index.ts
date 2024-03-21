import { Response } from "express";

export function randomizeArray<T>(array: T[]): T[] {
  const newArray = [...array];

  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }

  return newArray;
}

export const getBlockedCollectorsFromCookies = (signedCookies: {
  [key: string]: string;
}) => {
  return signedCookies && signedCookies.blocked_col
    ? (JSON.parse(signedCookies.blocked_col) as string[])
    : [];
};

export const setSurveyResponseDataCookie = (
  res: Response,
  surveyResponsesData: {
    id: string;
    surveyId: string;
    collectorId: string;
    submitted: boolean;
  }[]
) => {
  res.cookie("surveyResponses", JSON.stringify(surveyResponsesData), {
    secure: process.env.NODE_ENV === "production" ? true : false,
    // httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    signed: true,
    sameSite: "none",
  });
};

export const setBlockedCollectorsCookie = (
  res: Response,
  blockedCollectors: string[]
) => {
  res.cookie("blocked_col", JSON.stringify(blockedCollectors), {
    secure: process.env.NODE_ENV === "production" ? true : false,
    // httpOnly: true,
    signed: true,
    maxAge: 30 * 24 * 60 * 60 * 1000 * 24,
    sameSite: "none",
  });
};

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
