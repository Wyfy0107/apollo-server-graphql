const { ApolloServer, gql, PubSub } = require("apollo-server");
const mongoose = require("mongoose");
require("dotenv").config();

const pubsub = new PubSub();

//connect existing collection
const userSchema = new mongoose.Schema({
  email: String,
});

const postSchema = new mongoose.Schema({
  likes: Number,
  email: String,
  content: String,
});

const commentSchema = new mongoose.Schema({
  postId: String,
  commentList: [
    {
      email: String,
      comment: String,
    },
  ],
});

const Post = mongoose.model("Post", postSchema, "posts");
const User = mongoose.model("User", userSchema, "users");
const CommentList = mongoose.model("Comment-List", commentSchema);

//graphQL schema
const typeDefs = gql`
  type User {
    email: String
    posts: [Post]
  }

  type Post {
    id: ID!
    email: String
    content: String
    likes: Int
  }

  type CommentList {
    postId: String
    commentList: [Comment]
  }

  type Comment {
    email: String
    comment: String
  }

  type Query {
    users: [User]
    posts: [Post]
    user(email: String): [User]
    post(id: String): [Post]
    likes(id: String): [Post]
    commentList(id: String): CommentList
  }

  type Mutation {
    addPost(email: String, content: String): Post
    deletePost(id: String): Post
    updateLike(id: String, amount: Int): Post
    addComment(id: String, email: String, comment: String): Comment
  }

  type Subscription {
    newPostAdded: Post
  }
`;

const resolvers = {
  Query: {
    users: () => User.find(),
    posts: () => Post.find(),
    user: (parent, args) => User.find({ email: args.email }),
    post: (parent, args) => Post.find({ _id: args.id }),
    likes: (_, { id }) => Post.find({ _id: id }),
    commentList: (_, { id }) => CommentList.findOne({ postId: id }),
  },

  User: {
    posts: async user => {
      try {
        const postsByUser = Post.find({ email: user.email });
        return postsByUser;
      } catch (error) {
        console.log(err);
      }
    },
  },

  Mutation: {
    addPost: async (parent, args) => {
      const newPost = new Post({
        likes: 0,
        email: args.email,
        content: args.content,
      });

      try {
        const savedPost = await newPost.save();

        pubsub.publish("NEW_POST_ADDED", { newPostAdded: savedPost });

        return savedPost;
      } catch (err) {
        console.log(err);
      }
    },

    deletePost: async (parent, args) => {
      try {
        const deletedPost = await Post.deleteOne({ _id: args.id });
      } catch (err) {
        console.log(err);
      }
    },

    updateLike: async (parent, args) => {
      try {
        await Post.updateOne({ _id: args.id }, { likes: args.amount });
      } catch (error) {
        console.log(error);
      }
    },

    addComment: async (parent, { id, email, comment }) => {
      try {
        const newComment = { email: email, comment: comment };

        const commentList = await CommentList.findOne({ postId: id });

        if (commentList) {
          commentList.commentList.push(newComment);
          commentList.save();
          return newComment;
        }
        const newCommentList = new CommentList({
          postId: id,
          commentList: [],
        });

        newCommentList.commentList.push(newComment);
        newCommentList.save();
        return newComment;
      } catch (error) {
        console.log(error);
      }
    },
  },

  Subscription: {
    newPostAdded: {
      subscribe: () => pubsub.asyncIterator(["NEW_POST_ADDED"]),
    },
  },
};

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({ typeDefs, resolvers, introspection: true });

mongoose.connect(process.env.MONGO_DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// The `listen` method launches a web server.
server.listen({ port: process.env.PORT || 7000 }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
