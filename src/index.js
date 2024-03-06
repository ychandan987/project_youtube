import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import connectDB from "./db/index.js";

connectDB();


















/* import { express } from "express";
const app = express();
;(async() => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on("Error", (error)=>{
            console.log("Error :", error);
            throw error;
        });

        app.listen(process.env.PORT, ()=>{
            console.log(`app is listening on ${PORT}`);
        });
    } catch (error) {
        console.error("Error :", error);
        throw error;
    }
})()*/
