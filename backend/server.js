const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected ✅");
    })
    .catch((error) => {
        console.error("MongoDB Connection Error ❌", error);
    });

const {GoogleGenAI, Type}=
require("@google/genai");

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    family: 4,
    auth: {
        user: process.env.ADMIN_EMAIL,
        pass: process.env.ADMIN_EMAIL_PASSWORD
    }
});

const ai = new GoogleGenAI({
    apiKey:process.env.GEMINI_API_KEY
});

const userSchema = new mongoose.Schema({
    googleId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String
    },
    email: {
        type: String,
        required: true
    },
    photo: {
        type: String
    }
});

const User = mongoose.model("User", userSchema);

const reviewSchema = new mongoose.Schema({
    googleId: {
        type: String,
        required: true
    },
    language: {
        type: String,
        required: true
    },
    originalCode: {
        type: String,
        required: true
    },
    score: {
        type: Number
    },
    issues: {
        type: [String],
        default: []
    },
    suggestions: {
        type: [String],
        default: []
    },
    correctedCode: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Review = mongoose.model("Review", reviewSchema);

const app = express();

app.use(cors());
app.use(express.json());

const frontendPath = path.join(__dirname, "..");

app.use("/css", express.static(path.join(frontendPath, "css")));
app.use("/js", express.static(path.join(frontendPath, "js")));
app.use("/images", express.static(path.join(frontendPath, "images")));
app.use("/dist", express.static(path.join(frontendPath, "dist")));


app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

app.get("/login.html", (req, res) => {
    res.sendFile(path.join(frontendPath, "login.html"));
});

app.get("/dashboard.html", (req, res) => {
    res.sendFile(path.join(frontendPath, "dashboard.html"));
});

// ===============================
// SAVE GOOGLE USER
// ===============================

app.post("/api/users", async (req, res) => {

    try {

        const { googleId, name, email, photo } = req.body;

        const existingUser = await User.findOne({ googleId });

        if (existingUser) {

            return res.json({
                success: true,
                message: "User already exists",
                user: existingUser
            });

        }

        const newUser = await User.create({
            googleId,
            name,
            email,
            photo
        });

        res.status(201).json({
            success: true,
            message: "User saved successfully",
            user: newUser
        });

    } catch (error) {

    console.error("GEMINI ERROR:", error);

    res.status(500).json({
        error: error.message || "Gemini API error"
    });
}

});

app.post("/api/contact", async (req, res) => {

    try {

        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({
                error: "Please fill all fields"
            });
        }

        await transporter.sendMail({
            from: process.env.ADMIN_EMAIL,
            to: process.env.ADMIN_EMAIL,
            replyTo: email,
            subject: `LogicCraft Contact: ${name}`,
            text: `
Name: ${name}
Email: ${email}

Message:
${message}
            `
        });

        res.json({
            success: true,
            message: "Message sent successfully"
        });

    } catch (error) {

        console.error("Contact form error:", error);

        res.status(500).json({
            error: "Failed to send message"
        });
    }

});

app.post("/api/chat", async (req, res) => {

console.log("CHAT REQUEST RECEIVED:", req.body);

  try {
    
    const prompt = `
You are LogicCraft AI, an expert code reviewer.

${req.body.prompt}

IMPORTANT RULES FOR correctedCode:

- Return correctedCode as the COMPLETE corrected source code.
- PRESERVE proper line breaks and indentation.
- NEVER return the corrected code as a single line.
- Do NOT minify the code.
- Do NOT remove whitespace or indentation.
- Keep blank lines where they improve readability.
- Do NOT wrap the code in markdown code fences.
- correctedCode must contain ONLY the source code itself.
`;

    const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.NUMBER
            },
            issues: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING
              }
            },
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING
              }
            },
            correctedCode: {
              type: Type.STRING
            }
          },
          required: ["score", "issues", "suggestions", "correctedCode"]
        }
      }
    });

   const reviewData = JSON.parse(response.text);

await Review.create({
    googleId: req.body.googleId,
    language: req.body.language,
    originalCode: req.body.prompt,
    score: reviewData.score,
    issues: reviewData.issues,
    suggestions: reviewData.suggestions,
    correctedCode: reviewData.correctedCode
});

res.json(reviewData);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Gemini API error"
    });
  }
});

// ===============================
// GET USER REVIEW HISTORY
// ===============================

app.get("/api/reviews/:googleId", async (req, res) => {

    try {

        const reviews = await Review.find({
            googleId: req.params.googleId
        }).sort({
            createdAt: -1
        });

        res.json(reviews);

    } catch (error) {

        console.error("Get reviews error:", error);

        res.status(500).json({
            error: "Failed to get review history"
        });

    }

});

// ===============================
// DELETE SINGLE REVIEW
// ===============================

app.delete("/api/reviews/:id", async (req, res) => {

    try {

        const deletedReview = await Review.findByIdAndDelete(
            req.params.id
        );

        if (!deletedReview) {
            return res.status(404).json({
                error: "Review not found"
            });
        }

        res.json({
            success: true,
            message: "Review deleted successfully"
        });

    } catch (error) {

        console.error("Delete review error:", error);

        res.status(500).json({
            error: "Failed to delete review"
        });

    }

});


// ===============================
// CLEAR ALL USER REVIEW HISTORY
// ===============================

app.delete("/api/reviews/user/:googleId", async (req, res) => {

    try {

        await Review.deleteMany({
            googleId: req.params.googleId
        });

        res.json({
            success: true,
            message: "All review history cleared successfully"
        });

    } catch (error) {

        console.error("Clear history error:", error);

        res.status(500).json({
            error: "Failed to clear review history"
        });

    }

});



const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});