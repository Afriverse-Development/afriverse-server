const passport = require("passport");
const TwitterStrategy = require("passport-twitter").Strategy;
const User = require("../models/User");
const { v4: uuidv4 } = require("uuid");

passport.use(
  new TwitterStrategy(
    {
      consumerKey: process.env.TWITTER_CONSUMER_KEY,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
      callbackURL: process.env.TWITTER_CALLBACK_URL,
      includeEmail: true,
    },
    async (token, tokenSecret, profile, done) => {
      try {
        console.log("Twitter Profile:", profile);

        const {
          id,
          displayName,
          username,
          photos,
          emails,
          _json,
        } = profile;

        const email = emails?.[0]?.value;

        let user = await User.findOne({
          $or: [
            { twitterId: id },
            ...(email ? [{ email }] : []),
          ],
        });

        if (!user) {
          user = await User.create({
            email: email || `${username}@twitter.local`,
            firstName: displayName,
            lastName: "",
            twitterId: id,
            authProvider: "twitter",
            isEmailVerified: true,
            telegramToken: uuidv4(),

            twitterHandle: username,
            profileImage: photos?.[0]?.value,
            verified: _json?.verified || false,
          });
        } else {
          user.twitterId = id;

          if (!user.profileImage) {
            user.profileImage = photos?.[0]?.value;
          }

          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;