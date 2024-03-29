import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId);
        console.log("user_details :",user);
       const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        console.log("accessToken :", accessToken);
        console.log("refreshToken :", refreshToken);
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave : false});
        return{accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generation access and refresh token");
    }
}

const registerUser  = asyncHandler( async(req, res) => {
    // Get user details from the user
    // Validation - NOt empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // Create user object - create entry in DB
    // remove password and refresh token field from response
    // Check for user creation 
    // return response

    const {fullName, email, username, password} = req.body;
    // console.log("email and password :", email,password);
    if(
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are rquired");
    }

    const existedUser = await User.findOne({
        $or : [ { username }, { email }]
    })

    if(existedUser) {
        throw new ApiError(409, "User with email and username is already existed");
    }

    console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath  = req.files?.coverImage[0]?.path;
    // console.log("avatarLocalPath :",avatarLocalPath);

    let coverImageLocalPath;
    if (req.files || Array.isArray(req.files.coverImage) || req.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "AvatarLocalPath file is required")
    }



    const avatar = await uploadOnCloudinary(avatarLocalPath);
    // console.log("Avatar :",avatar);
   const coverImage = await uploadOnCloudinary(coverImageLocalPath);
   
    if(!avatar){
        throw new ApiError(400, "Avatar file is required");
    }

   const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase() 
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

});

const loginUser = asyncHandler(  async(req, res) => {
    // req body -> data
    // username or email
    // find the user
    // password check
    // access token and refresh token
    // send cookie 

    const { email, username, password} = req.body;
    if(!(username || email)){
        throw new ApiError(400, "Username and Email required");  
    }
     const user = await User.findOne({
        $or : [{username}, {email}]
     })

     if(!user){
        throw new ApiError(404, "User does not exist");
     }

     const isPasswordValid = await user.isPasswordCorrect(password);
     if(!isPasswordValid){
        console.log(401, "Invalid user credentials");
     }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);
    
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly : true,
        secure: true
    }
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user : loggedInUser, accessToken, refreshToken
            },
            "User logged in Successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set :{
                refreshToken : undefined
            }
        },
        {
            new : true
        }
        )
        const options = {
            httpOnly : true,
            secure: true
        }
        return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200,{}, "User logged Out"))

})

const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingRefreshToken = req.cookie.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unuthorized request");
    }
    try {
        const decodeToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = User.findById(decodeToken?._id);
        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }
         if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
         }
    
         const options = {
            httpOnly : true,
            secure : true
         }
    
         const{accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id);
    
         return res.status(200)
         .cookie("accessToekn", accessToken, options)
         .cookie("refreshToken", newRefreshToken, options)
         .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
         )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token");
    }
});

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword}= req.body;
    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await isPasswordCorrect(oldPassword);
    if (!(oldPassword === newPassword)) {
        throw new ApiError(401, "Invalid Old Password");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});
    return res
    .status(200)
    .json(new ApiResponse(200, {} , "Password Changed Successfully"))

});

const getCurrentUser  = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(200, req.user, "Current User fetched Successfully")
});

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body;
    if (!fullName || !email) {
        throw new ApiError(401, "All fields are required")        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email : email
            }
        },
        {new : true}
        
        ).select("-password");
        return res
        .status(200)
        .json(new ApiResponse(200, user, "Account Detaisl Updated Successfully"))
});

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar files is missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on Avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                avatar :avatar.path
            }
        },
        {new :true}
    ).select("-password")
    return res
    .status(200)
    .json(new ApiResponse(200, avatar, "Avatar image updated successfully"))
});

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImagePath = req.file?.path;
    if(!coverImagePath) {
        throw new ApiError(400, "CoverImage file is missing")
    }
    const CoverImage = await uploadOnCloudinary(coverImagePath);
    if (!CoverImage.url) {
        throw new ApiError(400, "Error while uploading cover image");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage : CoverImage.path
            }
        },
        {new:true}
        ).select("-password")

        return res
        .status(200)
        .json(new ApiResponse(200, coverImage, "Cover Image Update Successfully"))
});

const getUserChannelProfile = asyncHandler(async(req, res) => {
    const { username } = req.params;
    if (!username) {
        throw new ApiError(401, "Username is missing");
    }

   const channel = await User.aggregate([
        {
            $match : {
                username : username?.toLowerCase()
            }
        },
        {
            $lookup : {
                from : "subscriber",
                localField : "_id",
                foreignField : "channel",
                as : "subscribers"
            }
        },
        {
            $lookup:{
                from : "subscriber",
                localField : "-id",
                foreignField : "subscriber",
                as : "subscribedTo"
            }
        },
        {
            $addFields :{
                subscriberCount : {
                    $size : "$subscribers"
                },
                channelsSubscribedCount : {
                    $size : "$subscribedTo"
                },
                
                isSubscribed : {
                    $cons : {
                        if : {$in : [req.user?._id, "subscribers.subscriber"]},
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            $project : {
                fullName : 1,
                username : 1,
                subscriberCount : 1,
                channelsSubscribedCount : 1,
                isSubscribed : 1,
                avatar : 1,
                coverImage : 1,
                email : 1
            }
        }
        
    ])
    if (!channel.length?.length) {
        throw new ApiError(404, "Channel does not exist");
    }
    // console.log("channe : ",channel);
    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fethed successfully")
    )
});

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(req.user?.id)
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",
                pipeline: [
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner",
                            pipeline : {
                                $project : {
                                    fullName : 1,
                                    username : 1,
                                    avatar : 1
                                }
                            }
                        }
                    },
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200, user[0].watchHistory, "WatchHistory fetched successfully"));
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,

}