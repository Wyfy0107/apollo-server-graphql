const { ApolloServer, gql } = require("apollo-server");
const mongoose = require("mongoose");
require("dotenv").config();

//connect existing collection
const userSchema = new mongoose.Schema({
  username: String,
});
const postSchema = new mongoose.Schema({
  username: String,
  title: String,
  content: String,
});
const Post = mongoose.model("Post", postSchema, "posts");
const User = mongoose.model("User", userSchema, "users");

//graphQL schema
const typeDefs = gql`
  type User {
    username: String
    posts: [Post]
  }

  type Post {
    username: String
    title: String
    content: String
  }

  type Query {
    users: [User]
    posts: [Post]
    user(username: String): [User]
  }
`;

const resolvers = {
  Query: {
    users: () => User.find(),
    posts: () => Post.find(),
    user: (parent, args) => User.find({ username: args.username }),
  },

  User: {
    posts: user => Post.find({ username: user.username }),
  },
};

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({ typeDefs, resolvers });

mongoose.connect(process.env.MONGO_DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// The `listen` method launches a web server.
server.listen({ port: process.env.PORT || 5000 }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
