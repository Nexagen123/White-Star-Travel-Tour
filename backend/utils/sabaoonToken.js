import SabaoonToken from "../models/SabaoonToken.js";

export const storeSabaoonToken = async (token, expiry) => {
  try {
    await SabaoonToken.deleteMany({});

    const newToken = new SabaoonToken({
      token,
      expiry: new Date(expiry),
    });

    await newToken.save();
    console.log("Sabaoon token stored successfully");
    return newToken;
  } catch (error) {
    console.error("Error storing Sabaoon token:", error);
    throw error;
  }
};

export const getSabaoonToken = async () => {
  return await SabaoonToken.findOne().sort({ createdAt: -1 });
};

export const isTokenValid = async () => {
  const record = await getSabaoonToken();
  if (!record || !record.token) return false;

  return new Date(record.expiry) > new Date();
};

// Sabaoon third-party API calls removed.
export const refreshSabaoonToken = async () => {
  throw new Error("Sabaoon API integration is disabled");
};

export const getValidSabaoonToken = async () => {
  throw new Error("Sabaoon API integration is disabled");
};

export const initializeSabaoonToken = async () => {
  console.log("Sabaoon API integration is disabled — skipping token init");
};
