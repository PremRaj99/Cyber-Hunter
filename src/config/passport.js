import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../models/User.model.js";
import dotenv from "dotenv";

// Load environment variables directly
dotenv.config();

// Get GitHub credentials from environment variables
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_CALLBACK_URL =
  process.env.GITHUB_CALLBACK_URL ||
  "http://localhost:3000/api/v1/auth/github/callback";

const setupPassport = () => {
  console.log("Setting up Passport with GitHub strategy");
  console.log(`GitHub Client ID: ${GITHUB_CLIENT_ID}`);
  console.log(`GitHub Callback URL: ${GITHUB_CALLBACK_URL}`);

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    console.error("WARNING: GitHub OAuth credentials not properly configured!");
    console.error(
      "Make sure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are set in your .env file"
    );
    return; // Don't set up GitHub strategy if credentials are missing
  }

  // Serialize user into session
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  try {
    // Configure GitHub strategy with correct credentials from environment variables
    passport.use(
      new GitHubStrategy(
        {
          clientID: GITHUB_CLIENT_ID,
          clientSecret: GITHUB_CLIENT_SECRET,
          callbackURL: GITHUB_CALLBACK_URL,
          scope: ["user:email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            console.log("GitHub profile received:", profile.username);

            // Find or create user based on GitHub ID
            let user = await User.findOne({ githubId: profile.id });

            if (!user) {
              // Check if user exists by email
              const emails = profile.emails || [];
              let primaryEmail = emails.length > 0 ? emails[0].value : null;

              if (primaryEmail) {
                user = await User.findOne({ email: primaryEmail });

                if (user) {
                  // Link GitHub to existing account
                  user.githubId = profile.id;
                  user.githubUsername = profile.username;
                  user.displayName = profile.displayName || profile.username;
                  user.emailVerified = true; // GitHub emails are verified
                  await user.save();
                } else {
                  // Create new user with GitHub data
                  const randomPassword =
                    Math.random().toString(36).slice(-8) +
                    Math.random().toString(36).slice(-8);
                  user = await User.create({
                    email: primaryEmail,
                    password: randomPassword,
                    githubId: profile.id,
                    githubUsername: profile.username,
                    displayName: profile.displayName || profile.username,
                    emailVerified: true,
                  });
                }
              } else {
                // Create user with placeholder email if no email provided
                const randomPassword =
                  Math.random().toString(36).slice(-8) +
                  Math.random().toString(36).slice(-8);
                user = await User.create({
                  githubId: profile.id,
                  githubUsername: profile.username,
                  displayName: profile.displayName || profile.username,
                  email: `github-${profile.id}@placeholder.com`,
                  password: randomPassword,
                  emailVerified: true,
                });
              }
            } else {
              // Update existing user with latest GitHub info
              user.githubUsername = profile.username;
              user.displayName = profile.displayName || profile.username;
              await user.save();
            }

            return done(null, user);
          } catch (error) {
            console.error("GitHub auth error:", error);
            return done(error);
          }
        }
      )
    );
    console.log("GitHub strategy configured successfully");
  } catch (error) {
    console.error("Failed to configure GitHub strategy:", error);
  }
};

export default setupPassport;
