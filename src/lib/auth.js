import jwt from "jsonwebtoken";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.trim() === "") {
    throw new Error(
      "A variável de ambiente JWT_SECRET não está definida.",
    );
  }

  return secret;
}

export function signToken(payload) {
  return jwt.sign(payload, getJwtSecret(), {
    algorithm: "HS256",
    expiresIn: "7d",
  });
}

export function verifyToken(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const secret = getJwtSecret();

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    });

    if (!decoded || typeof decoded !== "object" || !decoded.userId) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}
