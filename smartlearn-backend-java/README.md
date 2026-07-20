# SmartLearn AI Tutor - Java Spring Boot Backend

This is a complete, fully-implemented Java Spring Boot REST API server that acts as the backend for the **SmartLearn AI Tutor** workspace, matching the exact directory architecture from your Adobe Photoshop sketch!

---

## 📂 Project Structure & Logic

- **`pom.xml`**: Project descriptor specifying Spring Boot parent, Web MVC structures, and Lombok models.
- **`src/main/resources/application.properties`**: Core parameters including Tomcat service ports and API configurations.
- **`src/main/java/com/smartlearn/ar/`**:
  - **`SmartlearnArApplication.java`**: Standard entrypoint starting the TomCat container.
  - **`dto/`** (Data Transfer Objects):
    - **`TutorRequest.java`**: Serialized student configurations (name, level, subject area, chosen teaching persona, prompt, and chat history array).
    - **`TutorResponse.java`**: Payload response containing generated markdown and pedagogical attributes.
    - **`ChatMessage.java`**: Single chat log node keeping contextual memory intact.
  - **`controller/TutorController.java`**: Handles incoming HTTP `POST /api/tutor` requests. It serializes request bodies and routes them safely.
  - **`service/AnthropicClient.java`**: Core secure server-side client communicating with Anthropic's Messages endpoint (`/v1/messages`) using standard Spring `RestTemplate`. It dynamically crafts customized prompt contexts from the student's chosen learning preferences!
- **`src/main/resources/static/`**:
  - Contains complete, ready-to-run static web resources (`index.html`, `Profile.html`, `Calculator.html`). When Spring Boot runs, it automatically binds and hosts these pages natively on `http://localhost:3000/`.

---

## ⚙️ Local Configuration & Running

1. **Prerequisites**: Ensure you have **Java Development Kit (JDK) 17** and **Maven** installed on your system.
2. **Set API Key**:
   Open `src/main/resources/application.properties` and replace:
   ```properties
   anthropic.api.key=YOUR_ANTHROPIC_API_KEY
   ```
   with your actual Claude API Key.
3. **Build & Run**:
   Navigate to `/smartlearn-backend-java` in your shell and execute:
   ```bash
   mvn spring-boot:run
   ```
4. **Access UI**:
   Open your browser to `http://localhost:3000/` to test your fully functional, locally running AI Socratic companion.

---

## 🚀 How to Deploy on Render.com (5-Step Checklist)

Render natively supports hosting Java Spring Boot applications using Docker or standard web service configs. Follow this quick setup to get it running in 5 minutes:

### Step 1: Create a GitHub Repository
Push this folder (`/smartlearn-backend-java`) to a new repository on your GitHub account.

### Step 2: New Web Service on Render
1. Log in to **[Render.com](https://render.com/)**.
2. Click **New +** and select **Web Service**.
3. Connect your GitHub account and select your newly created SmartLearn repository.

### Step 3: Configure Build & Start Commands
Under the Web Service settings, fill in these parameters:
- **Runtime**: `Java` (Select Java 17)
- **Build Command**: 
  ```bash
  mvn clean package -DskipTests
  ```
- **Start Command** (tells Render to run the generated compiled Spring JAR file):
  ```bash
  java -jar target/smartlearn-ar-1.0.0.jar
  ```

### Step 4: Configure Port Binding & Environment Variables
Because Render dynamically exposes and routes ports, you must configure port binding.
1. Click the **Environment** tab on Render.
2. Add these Environment Variables:
   - **`SERVER_PORT`**: `3000` *(Tells Spring Boot to run on port 3000, which Render maps to port 80/443 automatically)*
   - **`ANTHROPIC_API_KEY`**: `your_actual_anthropic_api_key` *(Safely injected into application.properties without hardcoding in git!)*

### Step 5: Deploy!
Click **Create Web Service**. Render will spin up the environment, compile the Maven project, load the static HTML views, and launch your Spring Boot server. Your live REST API will be accessible at `https://your-app-name.onrender.com/`.
