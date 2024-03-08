import mongoose, {Schema} from "mongoose";
import { jwt } from "jsonwebtoken";
import bcrypt from "bcrypt";
const userShema = new Schema( 
    {
        username : {
            type : String,
            required : true,
            unique : true,
            lowercase : true,
            trim : true,
            index : true
        },

        email : {
            type : String,
            requred : true,
            unique : true,
            lowercase: true,
            trim : true
        },

        fullName : {
            type : String,
            required : true,
            trim : true,
            index : true
        },

        avatar : {
            type : String, //Cloudinary url
            requred : true
        },

        coverImage : {
            type : String, // Cloudinary url

        },

        watchHistory : [
            {
                type : Schema.Types.ObjectId,
                ref : "Video"
            }
        ],

        password : {
            type : String,
            requred : [true, 'Password is required']
        },

        refreshToken : {
            type : String
        },
    },  {
        timestamps : true
    });
userShema.pre("save", async function(next){
    if(!this.isModified("password")) return next();
    this.password = bcrypt.hash(this.password, 10)
    next()
})
userShema.methods.isPasswordCorrect = async function(password){
   return await bcrypt.compare(password, this.password)
}

userShema.methods.generateAccessToken = function(){
    jwt.sign(
        {
            _id : this.id,
            email : this.email,
            username : this.username,
            fullName : this.fullName
        },
            process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY
        }

)
}
userShema.methods.generateRefreshToken = function(){
    jwt.sign(
        {
            _id : this.id
        },
            process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn : process.env.REFRESH_TOKEN_EXPIRY
        }

)
}
const User = mongoose.model("User", userShema);