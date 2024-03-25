import mongoose, { Schema } from "mongoose";

const subscriberSchema = new Schema({
  subscriber : {
    type : Schema.Types.ObjectId,// One who is subscribing
    ref : "User" 
  },
  
  channel : {
    type : Schema.Types.ObjectId,// one to whom 'subscriber is subscribing'
    ref : "User"
  }
}, {timestamps : true});

export const Subscriber = mongoose.model("Subscriber", subscriberSchema);