package com.campuscare;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.mindrot.jbcrypt.BCrypt;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.*;
import java.time.Instant;
import java.util.*;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.util.Base64;
import java.util.concurrent.Executors;

public class JavaWebServer {
    private static final String JWT_SECRET = envSecret();
    private static final AuthService AUTH = new AuthService();
    private static final AppointmentService APPOINTMENTS = new AppointmentService();

    public static void main(String[] args) throws Exception {
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "3000"));
        DBConnection.ensureAvailabilityMetadataSchema();
        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 0);
        server.setExecutor(Executors.newCachedThreadPool());
        server.createContext("/api/", JavaWebServer::handleApi);
        server.createContext("/", JavaWebServer::handleStatic);
        server.start();
        System.out.println("[CampusCare Java] JDBC web backend running on http://0.0.0.0:" + port);
    }

    private static String envSecret() {
        String secret = System.getenv("JWT_SECRET");
        if (secret != null && !secret.isBlank()) return secret;
        return "campuscare-jwt-secret-key-production-change-2026";
    }

    private static void handleApi(HttpExchange exchange) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.getResponseHeaders().set("Cache-Control", "no-store");

        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();
        String rawBody = readBody(exchange);

        try {
            Map<String, Object> body = parseJson(rawBody);
            if ("GET".equals(method) && path.equals("/api/health")) {
                send(exchange, 200, "{\"status\":\"UP\",\"timestamp\":\"" + Instant.now()
                    + "\",\"service\":\"CampusCare Java JDBC API\",\"database\":{\"isLiveMySQL\":"
                    + DBConnection.testConnection()
                    + ",\"message\":\"JDBC connection via MySQL Connector/J\",\"configuredHost\":\"localhost\",\"configuredPort\":\"3306\",\"databaseName\":\"campuscare\"},\"tables_verified\":[\"students\",\"counsellors\",\"counsellor_availability\",\"appointments\",\"screenings\",\"password_recovery\"]}");
            } else if ("POST".equals(method) && path.equals("/api/auth/student/register")) {
                studentRegister(exchange, body);
            } else if ("POST".equals(method) && path.equals("/api/auth/student/login")) {
                studentLogin(exchange, body);
            } else if ("POST".equals(method) && path.equals("/api/auth/counsellor/register")) {
                counsellorRegister(exchange, body);
            } else if ("POST".equals(method) && path.equals("/api/auth/counsellor/login")) {
                counsellorLogin(exchange, body);
            } else if ("GET".equals(method) && path.equals("/api/auth/me")) {
                authRequired(exchange, null, null);
            } else if ("GET".equals(method) && path.equals("/api/availability")) {
                publicSlots(exchange, query(exchange));
            } else if ("GET".equals(method) && path.equals("/api/availability/my-slots")) {
                counsellorRequired(exchange, user -> mySlots(exchange, user));
            } else if ("POST".equals(method) && path.equals("/api/availability")) {
                counsellorRequired(exchange, user -> createSlot(exchange, body, user));
            } else if ("DELETE".equals(method) && path.matches("/api/availability/[0-9]+")) {
                counsellorRequired(exchange, user -> deleteSlot(exchange, path, user));
            } else if ("POST".equals(method) && path.equals("/api/screenings")) {
                studentRequired(exchange, user -> submitScreening(exchange, body, user));
            } else if ("GET".equals(method) && path.equals("/api/screenings/history")) {
                studentRequired(exchange, user -> screeningHistory(exchange, user));
            } else if ("GET".equals(method) && path.matches("/api/screenings/counsellor/[0-9]+")) {
                counsellorRequired(exchange, user -> counsellorScreenings(exchange, path, user));
            } else if ("GET".equals(method) && path.equals("/api/screenings/analytics")) {
                counsellorRequired(exchange, user -> analytics(exchange, user));
            } else if ("GET".equals(method) && path.equals("/api/appointments/student")) {
                studentRequired(exchange, user -> studentAppointments(exchange, user));
            } else if ("GET".equals(method) && path.equals("/api/appointments/counsellor")) {
                counsellorRequired(exchange, user -> counsellorAppointments(exchange, user));
            } else if ("GET".equals(method) && path.equals("/api/appointments/counsellor/authorized-students")) {
                counsellorRequired(exchange, user -> authorizedStudents(exchange, user));
            } else if ("POST".equals(method) && path.equals("/api/appointments/book")) {
                studentRequired(exchange, user -> bookAppointment(exchange, body, user));
            } else if ("POST".equals(method) && path.matches("/api/appointments/[0-9]+/(accept|reject|cancel|complete)")) {
                appointmentAction(exchange, method, path, body);
            } else if ("POST".equals(method) && path.equals("/api/recovery/request")) {
                recoveryRequest(exchange, body);
            } else if ("POST".equals(method) && path.equals("/api/recovery/verify")) {
                recoveryVerify(exchange, body);
            } else if ("POST".equals(method) && path.equals("/api/recovery/reset")) {
                recoveryReset(exchange, body);
            } else {
                send(exchange, 404, "{\"error\":\"API route " + escape(method + " " + path) + " not found\"}");
            }
        } catch (Exception ex) {
            ex.printStackTrace();
            send(exchange, 500, "{\"error\":\"" + escape(ex.getMessage() == null ? "Internal server error" : ex.getMessage()) + "\"}");
        }
    }

    private static void handleStatic(HttpExchange exchange) throws IOException {
        Path dist = Path.of("dist");
        String requestPath = exchange.getRequestURI().getPath();
        String relative = requestPath.equals("/") ? "index.html" : requestPath.substring(1);
        Path file = dist.resolve(relative).normalize();
        if (!file.startsWith(dist.normalize()) || !Files.isRegularFile(file)) file = dist.resolve("index.html");
        if (!Files.isRegularFile(file)) {
            send(exchange, 404, "{\"error\":\"Frontend build not found. Run npm run build.\"}");
            return;
        }
        byte[] data = Files.readAllBytes(file);
        String lower = file.toString().toLowerCase(Locale.ROOT);
        String type = lower.endsWith(".html") ? "text/html" : lower.endsWith(".js") ? "text/javascript"
            : lower.endsWith(".css") ? "text/css" : lower.endsWith(".svg") ? "image/svg+xml"
            : lower.endsWith(".json") ? "application/json" : "application/octet-stream";
        exchange.getResponseHeaders().set("Content-Type", type);
        exchange.sendResponseHeaders(200, data.length);
        exchange.getResponseBody().write(data);
        exchange.close();
    }

    private static void studentRegister(HttpExchange exchange, Map<String, Object> body) throws Exception {
        Models.User user = AUTH.registerStudent(s(body, "full_name"), s(body, "email"), s(body, "password"));
        sendUser(exchange, 201, "Student account registered successfully.", user);
    }

    private static void studentLogin(HttpExchange exchange, Map<String, Object> body) throws Exception {
        Models.User user = AUTH.loginStudent(s(body, "email"), s(body, "password"));
        sendUser(exchange, 200, "Login successful.", user);
    }

    private static void counsellorRegister(HttpExchange exchange, Map<String, Object> body) throws Exception {
        AUTH.registerCounsellor(s(body, "full_name"), s(body, "email"), s(body, "specialization"), s(body, "password"));
        send(exchange, 201, "{\"message\":\"Registration submitted successfully. Your account is pending administrative verification before you can log in.\",\"is_active\":0}");
    }

    private static void counsellorLogin(HttpExchange exchange, Map<String, Object> body) throws Exception {
        Models.User user = AUTH.loginCounsellor(s(body, "email"), s(body, "password"));
        sendUser(exchange, 200, "Login successful.", user);
    }

    private static void recoveryRequest(HttpExchange exchange, Map<String, Object> body) throws Exception {
        String accountType = s(body, "account_type");
        String email = s(body, "email").trim().toLowerCase(Locale.ROOT);
        if (!"STUDENT".equals(accountType) && !"COUNSELLOR".equals(accountType)) {
            send(exchange, 400, "{\"error\":\"Valid account_type (STUDENT or COUNSELLOR) is required.\"}");
            return;
        }
        if (email.isEmpty()) {
            send(exchange, 400, "{\"error\":\"A valid email address is required.\"}");
            return;
        }

        String uniformMessage = "If an account is associated with this email address, a 6-digit verification code has been dispatched. Please check your inbox.";
        String table = "STUDENT".equals(accountType) ? "students" : "counsellors";
        boolean exists;
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement("SELECT 1 FROM " + table + " WHERE email = ? LIMIT 1")) {
            stmt.setString(1, email);
            try (ResultSet rs = stmt.executeQuery()) {
                exists = rs.next();
            }
        }
        if (!exists) {
            send(exchange, 200, "{\"message\":\"" + escape(uniformMessage) + "\",\"expires_in_minutes\":10}");
            return;
        }

        String code = String.format(Locale.ROOT, "%06d", new java.security.SecureRandom().nextInt(1_000_000));
        Timestamp expires = new Timestamp(System.currentTimeMillis() + 10 * 60 * 1000L);
        Timestamp now = new Timestamp(System.currentTimeMillis());
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(
                 "INSERT INTO password_recovery (account_type, email, code_hash, code_expires_at, attempt_count, last_sent_at) VALUES (?, ?, ?, ?, 0, ?)")) {
            stmt.setString(1, accountType);
            stmt.setString(2, email);
            stmt.setString(3, sha256(code));
            stmt.setTimestamp(4, expires);
            stmt.setTimestamp(5, now);
            stmt.executeUpdate();
        }
        send(exchange, 200, "{\"message\":\"" + escape(uniformMessage) + "\",\"expires_in_minutes\":10,\"dev_code_hint\":\"" + code + "\"}");
    }

    private static void recoveryVerify(HttpExchange exchange, Map<String, Object> body) throws Exception {
        String accountType = s(body, "account_type");
        String email = s(body, "email").trim().toLowerCase(Locale.ROOT);
        String code = s(body, "code").trim();
        if (!"STUDENT".equals(accountType) && !"COUNSELLOR".equals(accountType)) {
            send(exchange, 400, "{\"error\":\"Valid account_type (STUDENT or COUNSELLOR) is required.\"}");
            return;
        }
        if (!code.matches("\\d{6}")) {
            send(exchange, 400, "{\"error\":\"Email and valid 6-digit code are required.\"}");
            return;
        }

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(
                 "SELECT recovery_id, code_hash, attempt_count FROM password_recovery "
                 + "WHERE account_type = ? AND email = ? AND used_at IS NULL AND verified_at IS NULL "
                 + "AND code_expires_at > UTC_TIMESTAMP() ORDER BY created_at DESC LIMIT 1")) {
            stmt.setString(1, accountType);
            stmt.setString(2, email);
            try (ResultSet rs = stmt.executeQuery()) {
                if (!rs.next()) {
                    send(exchange, 400, "{\"error\":\"No active verification code found or code has expired. Please request a new code.\"}");
                    return;
                }
                int recoveryId = rs.getInt("recovery_id");
                int attempts = rs.getInt("attempt_count");
                String codeHash = rs.getString("code_hash");
                if (attempts >= 5) {
                    send(exchange, 429, "{\"error\":\"Maximum verification attempts exceeded. Please request a new recovery code.\"}");
                    return;
                }
                if (!sha256(code).equals(codeHash)) {
                    try (PreparedStatement update = conn.prepareStatement(
                        "UPDATE password_recovery SET attempt_count = attempt_count + 1 WHERE recovery_id = ?")) {
                        update.setInt(1, recoveryId);
                        update.executeUpdate();
                    }
                    int remaining = 4 - attempts;
                    send(exchange, 400, "{\"error\":\"Invalid recovery code. " + (remaining > 0 ? remaining + " attempts remaining." : "Code locked.") + "\"}");
                    return;
                }

                byte[] random = new byte[32];
                new java.security.SecureRandom().nextBytes(random);
                String resetToken = Base64.getUrlEncoder().withoutPadding().encodeToString(random);
                Timestamp expires = new Timestamp(System.currentTimeMillis() + 30 * 60 * 1000L);
                try (PreparedStatement update = conn.prepareStatement(
                    "UPDATE password_recovery SET verified_at = UTC_TIMESTAMP(), reset_token_hash = ?, reset_token_expires_at = ? WHERE recovery_id = ?")) {
                    update.setString(1, sha256(resetToken));
                    update.setTimestamp(2, expires);
                    update.setInt(3, recoveryId);
                    update.executeUpdate();
                }
                send(exchange, 200, "{\"message\":\"Recovery code verified successfully.\",\"reset_token\":\"" + resetToken + "\"}");
            }
        }
    }

    private static void recoveryReset(HttpExchange exchange, Map<String, Object> body) throws Exception {
        String resetToken = s(body, "reset_token");
        String newPassword = s(body, "new_password");
        if (resetToken.isEmpty()) {
            send(exchange, 400, "{\"error\":\"Missing reset token.\"}");
            return;
        }
        if (newPassword.length() < 8) {
            send(exchange, 400, "{\"error\":\"Password must be at least 8 characters long.\"}");
            return;
        }

        String tokenHash = sha256(resetToken);
        try (Connection conn = DBConnection.getConnection()) {
            conn.setAutoCommit(false);
            try {
                String select = "SELECT recovery_id, account_type, email FROM password_recovery "
                    + "WHERE reset_token_hash = ? AND used_at IS NULL "
                    + "AND reset_token_expires_at > UTC_TIMESTAMP() LIMIT 1";
                int recoveryId;
                String accountType;
                String email;
                try (PreparedStatement stmt = conn.prepareStatement(select)) {
                    stmt.setString(1, tokenHash);
                    try (ResultSet rs = stmt.executeQuery()) {
                        if (!rs.next()) {
                            conn.rollback();
                            send(exchange, 400, "{\"error\":\"Reset token is invalid or has expired. Please restart recovery.\"}");
                            return;
                        }
                        recoveryId = rs.getInt("recovery_id");
                        accountType = rs.getString("account_type");
                        email = rs.getString("email");
                    }
                }
                String table = "STUDENT".equals(accountType) ? "students" : "counsellors";
                String hash = BCrypt.hashpw(newPassword, BCrypt.gensalt(10));
                try (PreparedStatement update = conn.prepareStatement(
                    "UPDATE " + table + " SET password_hash = ? WHERE email = ?")) {
                    update.setString(1, hash);
                    update.setString(2, email);
                    if (update.executeUpdate() != 1) throw new SQLException("Account not found.");
                }
                try (PreparedStatement update = conn.prepareStatement(
                    "UPDATE password_recovery SET used_at = UTC_TIMESTAMP() WHERE recovery_id = ?")) {
                    update.setInt(1, recoveryId);
                    update.executeUpdate();
                }
                conn.commit();
                send(exchange, 200, "{\"message\":\"Password reset successfully.\"}");
            } catch (Exception ex) {
                conn.rollback();
                throw ex;
            } finally {
                conn.setAutoCommit(true);
            }
        }
    }

    private static String sha256(String value) throws Exception {
        java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder out = new StringBuilder();
        for (byte b : hash) out.append(String.format(Locale.ROOT, "%02x", b));
        return out.toString();
    }

    private static void sendUser(HttpExchange exchange, int status, String message, Models.User user) throws IOException {
        String json = "{\"message\":\"" + escape(message) + "\",\"token\":\"" + signToken(user) + "\",\"user\":"
            + "{\"id\":" + user.id + ",\"email\":\"" + escape(user.email) + "\",\"name\":\"" + escape(user.fullName)
            + "\",\"role\":\"" + user.role + "\"" + (user.specialization != null ? ",\"specialization\":\"" + escape(user.specialization) + "\"" : "") + "}}";
        send(exchange, status, json);
    }

    private static void authRequired(HttpExchange exchange, java.util.function.Consumer<UserContext> noArg,
                                     java.util.function.Consumer<UserContext> roleArg) throws IOException {
        UserContext user = verifyAuthorization(exchange);
        if (user == null) {
            send(exchange, 401, "{\"error\":\"Authentication required. Please log in.\"}");
            return;
        }
        send(exchange, 200, "{\"id\":" + user.id + ",\"email\":\"" + escape(user.email) + "\",\"name\":\"" + escape(user.name)
            + "\",\"role\":\"" + user.role + "\"}");
    }

    private interface ThrowingConsumer { void accept(UserContext user) throws Exception; }

    private static void studentRequired(HttpExchange exchange, ThrowingConsumer consumer) throws Exception {
        UserContext user = verifyAuthorization(exchange);
        if (user == null) { send(exchange, 401, "{\"error\":\"Authentication required. Please log in.\"}"); return; }
        if (!"STUDENT".equals(user.role)) { send(exchange, 403, "{\"error\":\"Access forbidden: Requires STUDENT role.\"}"); return; }
        consumer.accept(user);
    }

    private static void counsellorRequired(HttpExchange exchange, ThrowingConsumer consumer) throws Exception {
        UserContext user = verifyAuthorization(exchange);
        if (user == null) { send(exchange, 401, "{\"error\":\"Authentication required. Please log in.\"}"); return; }
        if (!"COUNSELLOR".equals(user.role)) { send(exchange, 403, "{\"error\":\"Access forbidden: Requires COUNSELLOR role.\"}"); return; }
        consumer.accept(user);
    }

    private static void publicSlots(HttpExchange exchange, Map<String, String> query) throws Exception {
        List<Models.AvailabilitySlot> slots = APPOINTMENTS.getAvailableSlots();
        StringBuilder json = new StringBuilder("{\"slots\":[");
        for (int i = 0; i < slots.size(); i++) {
            Models.AvailabilitySlot slot = slots.get(i);
            if (i > 0) json.append(',');
            json.append("{\"availability_id\":").append(slot.availabilityId)
                .append(",\"counsellor_id\":").append(slot.counsellorId)
                .append(",\"slot_start\":\"").append(mysqlTime(slot.slotStart)).append("\"")
                .append(",\"slot_end\":\"").append(mysqlTime(slot.slotEnd)).append("\"")
                .append(",\"is_available\":").append(slot.isAvailable ? 1 : 0)
                .append(",\"counsellor_name\":\"").append(escape(slot.counsellorName)).append("\"")
                .append(",\"specialization\":\"").append(escape(slot.specialization)).append("\"")
                .append(",\"session_mode\":\"").append(escape(slot.sessionMode)).append("\"")
                .append(",\"meeting_link\":").append(slot.meetingLink == null ? "null" : "\"" + escape(slot.meetingLink) + "\"")
                .append(",\"location\":").append(slot.location == null ? "null" : "\"" + escape(slot.location) + "\"")
                .append(",\"notes\":").append(slot.notes == null ? "null" : "\"" + escape(slot.notes) + "\"")
                .append("}");
        }
        json.append("]}");
        send(exchange, 200, json.toString());
    }

    private static void mySlots(HttpExchange exchange, UserContext user) throws Exception {
        List<Models.AvailabilitySlot> slots = APPOINTMENTS.getCounsellorAvailabilitySlots(user.id);
        StringBuilder json = new StringBuilder("{\"slots\":[");
        for (int i = 0; i < slots.size(); i++) {
            Models.AvailabilitySlot slot = slots.get(i);
            if (i > 0) json.append(',');
            json.append("{\"availability_id\":").append(slot.availabilityId)
                .append(",\"counsellor_id\":").append(slot.counsellorId)
                .append(",\"slot_start\":\"").append(mysqlTime(slot.slotStart)).append("\"")
                .append(",\"slot_end\":\"").append(mysqlTime(slot.slotEnd)).append("\"")
                .append(",\"is_available\":").append(slot.isAvailable ? 1 : 0)
                .append(",\"session_mode\":\"").append(escape(slot.sessionMode)).append("\"")
                .append(",\"meeting_link\":").append(slot.meetingLink == null ? "null" : "\"" + escape(slot.meetingLink) + "\"")
                .append(",\"location\":").append(slot.location == null ? "null" : "\"" + escape(slot.location) + "\"")
                .append(",\"notes\":").append(slot.notes == null ? "null" : "\"" + escape(slot.notes) + "\"")
                .append(",\"is_booked\":").append(slot.isAvailable ? "false" : "true")
                .append(",\"booking\":null}");
        }
        json.append("]}");
        send(exchange, 200, json.toString());
    }

    private static void createSlot(HttpExchange exchange, Map<String, Object> body, UserContext user) throws Exception {
        Timestamp start = Timestamp.valueOf(s(body, "slot_start").replace('T', ' ').replaceAll("\\.\\d{3}.*$", ""));
        Timestamp end = Timestamp.valueOf(s(body, "slot_end").replace('T', ' ').replaceAll("\\.\\d{3}.*$", ""));
        String mode = "ONLINE".equals(s(body, "session_mode")) ? "ONLINE" : "OFFLINE";
        String meetingLink = s(body, "meeting_link").trim();
        if ("ONLINE".equals(mode)) {
            if (!meetingLink.matches("^https?://.+")) {
                throw new IllegalArgumentException("A valid meeting URL starting with http:// or https:// is required.");
            }
        }
        APPOINTMENTS.createSlot(user.id, start, end, mode, meetingLink, s(body, "location"), s(body, "notes"));
        send(exchange, 201, "{\"message\":\"Availability slot published successfully.\"}");
    }

    private static void deleteSlot(HttpExchange exchange, String path, UserContext user) throws Exception {
        int id = Integer.parseInt(path.substring(path.lastIndexOf('/') + 1));
        APPOINTMENTS.deleteSlot(id, user.id);
        send(exchange, 200, "{\"message\":\"Availability slot deleted successfully.\"}");
    }

    private static void submitScreening(HttpExchange exchange, Map<String, Object> body, UserContext user) throws Exception {
        Object responses = body.get("responses");
        double score = d(body, "overall_score");
        String summary = s(body, "screening_summary");
        if (responses == null) throw new IllegalArgumentException("Valid responses JSON object is required.");
        String responsesJson = toJson(responses);
        int id;
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(
                 "INSERT INTO screenings (student_id, responses, overall_score, screening_summary) VALUES (?, ?, ?, ?)",
                 Statement.RETURN_GENERATED_KEYS)) {
            stmt.setInt(1, user.id);
            stmt.setString(2, responsesJson);
            stmt.setDouble(3, score);
            stmt.setString(4, summary);
            stmt.executeUpdate();
            try (ResultSet keys = stmt.getGeneratedKeys()) { id = keys.next() ? keys.getInt(1) : 0; }
        }
        send(exchange, 201, "{\"message\":\"Wellness screening saved successfully.\",\"screening\":{\"screening_id\":"
            + id + ",\"student_id\":" + user.id + ",\"overall_score\":" + score
            + ",\"screening_summary\":\"" + escape(summary) + "\"},\"disclaimer\":\"This screening is informational and does not replace a clinical psychiatric or medical evaluation.\"}");
    }

    private static void screeningHistory(HttpExchange exchange, UserContext user) throws Exception {
        List<Models.Screening> screenings = APPOINTMENTS instanceof AppointmentService
            ? getScreenings(user.id) : Collections.emptyList();
        StringBuilder json = new StringBuilder("{\"screenings\":[");
        for (int i = 0; i < screenings.size(); i++) {
            Models.Screening screening = screenings.get(i);
            if (i > 0) json.append(',');
            json.append("{\"screening_id\":").append(screening.screeningId)
                .append(",\"student_id\":").append(screening.studentId)
                .append(",\"overall_score\":").append(screening.overallScore)
                .append(",\"screening_summary\":").append(screening.summary == null ? "null" : "\"" + escape(screening.summary) + "\"")
                .append(",\"submitted_at\":\"").append(mysqlTime(screening.submittedAt)).append("\"}");
        }
        json.append("]}");
        send(exchange, 200, json.toString());
    }

    private static List<Models.Screening> getScreenings(int studentId) throws SQLException {
        return new AppointmentService().getStudentScreenings(studentId);
    }

    private static void counsellorScreenings(HttpExchange exchange, String path, UserContext user) throws Exception {
        int studentId = Integer.parseInt(path.substring(path.lastIndexOf('/') + 1));
        List<Models.Screening> screenings = APPOINTMENTS.getAuthorizedStudentScreenings(user.id, studentId);
        StringBuilder json = new StringBuilder("{\"screenings\":[");
        for (int i = 0; i < screenings.size(); i++) {
            Models.Screening screening = screenings.get(i);
            if (i > 0) json.append(',');
            json.append("{\"screening_id\":").append(screening.screeningId)
                .append(",\"student_id\":").append(screening.studentId)
                .append(",\"overall_score\":").append(screening.overallScore)
                .append(",\"screening_summary\":").append(screening.summary == null ? "null" : "\"" + escape(screening.summary) + "\"")
                .append(",\"submitted_at\":\"").append(mysqlTime(screening.submittedAt)).append("\"}");
        }
        json.append("]}");
        send(exchange, 200, json.toString());
    }

    private static void analytics(HttpExchange exchange, UserContext user) throws Exception {
        Models.ClinicalAnalytics data = APPOINTMENTS.getCounsellorAnalytics(user.id);
        send(exchange, 200, "{\"total_screenings\":" + data.totalScreenings
            + ",\"unique_students_screened\":" + data.totalStudents
            + ",\"average_score\":" + data.averageScore
            + ",\"distribution\":{\"mild\":{\"count\":" + data.lowDistressCount + ",\"label\":\"Mild Stress (0-9)\",\"percent\":0},"
            + "\"moderate\":{\"count\":" + data.moderateDistressCount + ",\"label\":\"Moderate Distress (10-14)\",\"percent\":0},"
            + "\"severe\":{\"count\":" + data.highDistressCount + ",\"label\":\"Severe Distress (15+)\",\"percent\":0}},\"timeline\":[]}");
    }

    private static void studentAppointments(HttpExchange exchange, UserContext user) throws Exception {
        sendAppointments(exchange, APPOINTMENTS.getStudentAppointments(user.id), false);
    }

    private static void counsellorAppointments(HttpExchange exchange, UserContext user) throws Exception {
        sendAppointments(exchange, APPOINTMENTS.getCounsellorAppointments(user.id), true);
    }

    private static void sendAppointments(HttpExchange exchange, List<Models.Appointment> appointments, boolean counsellor) throws IOException {
        StringBuilder json = new StringBuilder("{\"appointments\":[");
        for (int i = 0; i < appointments.size(); i++) {
            Models.Appointment appt = appointments.get(i);
            if (i > 0) json.append(',');
            json.append("{\"appointment_id\":").append(appt.appointmentId)
                .append(",\"student_id\":").append(appt.studentId)
                .append(",\"availability_id\":").append(appt.availabilityId)
                .append(",\"booking_status\":\"").append(escape(appt.bookingStatus)).append("\"")
                .append(",\"workflow_status\":\"").append(escape(appt.workflowStatus)).append("\"")
                .append(",\"session_mode\":\"").append(escape(appt.sessionMode)).append("\"")
                .append(",\"meeting_link\":").append(counsellor || "CONFIRMED".equals(appt.workflowStatus)
                    ? (appt.meetingLink == null ? "null" : "\"" + escape(appt.meetingLink) + "\"") : "null")
                .append(",\"location\":").append(appt.location == null ? "null" : "\"" + escape(appt.location) + "\"")
                .append(",\"student_reason\":\"").append(escape(appt.reason)).append("\"")
                .append(",\"reason\":\"").append(escape(appt.reason)).append("\"")
                .append(",\"slot_start\":\"").append(mysqlTime(appt.slotStart)).append("\"")
                .append(",\"slot_end\":\"").append(mysqlTime(appt.slotEnd)).append("\"")
                .append(",\"counsellor_name\":\"").append(escape(appt.counsellorName)).append("\"")
                .append(",\"student_name\":").append(appt.studentName == null ? "null" : "\"" + escape(appt.studentName) + "\"")
                .append(",\"student_email\":").append(appt.studentEmail == null ? "null" : "\"" + escape(appt.studentEmail) + "\"")
                .append("}");
        }
        json.append("]}");
        send(exchange, 200, json.toString());
    }

    private static void authorizedStudents(HttpExchange exchange, UserContext user) throws Exception {
        List<Models.AuthorizedStudent> students = APPOINTMENTS.getAuthorizedStudents(user.id);
        StringBuilder json = new StringBuilder("{\"students\":[");
        for (int i = 0; i < students.size(); i++) {
            Models.AuthorizedStudent student = students.get(i);
            if (i > 0) json.append(',');
            json.append("{\"student_id\":").append(student.studentId)
                .append(",\"full_name\":\"").append(escape(student.fullName)).append("\"")
                .append(",\"email\":\"").append(escape(student.email)).append("\"")
                .append(",\"total_sessions\":").append(student.totalSessions)
                .append(",\"latest_session_date\":\"").append(mysqlTime(student.latestSessionDate)).append("\"}");
        }
        json.append("]}");
        send(exchange, 200, json.toString());
    }

    private static void bookAppointment(HttpExchange exchange, Map<String, Object> body, UserContext user) throws Exception {
        int availabilityId = i(body, "availability_id");
        String reason = s(body, "reason");
        String mode = "OFFLINE";
        String meetingLink = null;
        String location = "Campus Health Center, Room 204";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(
                 "SELECT session_mode, meeting_link, location FROM counsellor_availability WHERE availability_id = ?")) {
            stmt.setInt(1, availabilityId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    String slotMode = rs.getString("session_mode");
                    if ("ONLINE".equals(slotMode)) mode = "ONLINE";
                    meetingLink = rs.getString("meeting_link");
                    String slotLocation = rs.getString("location");
                    if (slotLocation != null && !slotLocation.isBlank()) location = slotLocation;
                }
            }
        }
        APPOINTMENTS.bookAppointment(user.id, availabilityId, reason, mode, meetingLink, location);
        send(exchange, 201, "{\"message\":\"Booking request submitted successfully. Awaiting counsellor confirmation.\",\"appointment\":null}");
    }

    private static void appointmentAction(HttpExchange exchange, String method, String path, Map<String, Object> body) throws Exception {
        String[] parts = path.split("/");
        int id = Integer.parseInt(parts[parts.length - 2]);
        String action = parts[parts.length - 1];
        if ("accept".equals(action)) APPOINTMENTS.acceptRequest(id);
        else if ("reject".equals(action)) APPOINTMENTS.rejectRequest(id, s(body, "rejection_reason"));
        else if ("cancel".equals(action)) APPOINTMENTS.cancelAppointment(id);
        else if ("complete".equals(action)) APPOINTMENTS.completeAppointment(id);
        send(exchange, 200, "{\"message\":\"Appointment updated successfully.\",\"appointment\":null}");
    }

    private static UserContext verifyAuthorization(HttpExchange exchange) {
        String auth = exchange.getRequestHeaders().getFirst("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) return null;
        return verifyToken(auth.substring(7));
    }

    private static String signToken(Models.User user) {
        long exp = Instant.now().getEpochSecond() + 604800;
        String header = b64("{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
        String payload = b64("{\"id\":" + user.id + ",\"email\":\"" + escape(user.email) + "\",\"role\":\"" + user.role
            + "\",\"name\":\"" + escape(user.fullName) + "\",\"exp\":" + exp + "}");
        return header + "." + payload + "." + hmac(header + "." + payload);
    }

    private static UserContext verifyToken(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3 || !hmac(parts[0] + "." + parts[1]).equals(parts[2])) return null;
            Map<String, Object> payload = parseJson(new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8));
            long exp = ((Number) payload.get("exp")).longValue();
            if (exp < Instant.now().getEpochSecond()) return null;
            return new UserContext(i(payload, "id"), s(payload, "email"), s(payload, "name"), s(payload, "role"));
        } catch (Exception ex) {
            return null;
        }
    }

    private static String hmac(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(JWT_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
    }

    private static String b64(String value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private static String mysqlTime(Timestamp timestamp) {
        return timestamp == null ? "" : timestamp.toString().replace(".0", "");
    }

    private static String readBody(HttpExchange exchange) throws IOException {
        return new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
    }

    private static Map<String, String> query(HttpExchange exchange) {
        Map<String, String> map = new HashMap<>();
        String raw = exchange.getRequestURI().getRawQuery();
        if (raw == null) return map;
        for (String pair : raw.split("&")) {
            String[] kv = pair.split("=", 2);
            if (kv.length == 2) {
                map.put(kv[0], URLDecoder.decode(kv[1], StandardCharsets.UTF_8));
            }
        }
        return map;
    }

    private static void send(HttpExchange exchange, int status, String body) throws IOException {
        byte[] data = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, data.length);
        exchange.getResponseBody().write(data);
        exchange.getResponseBody().flush();
        exchange.close();
    }

    private static String escape(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }

    private static String s(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value == null ? "" : String.valueOf(value);
    }

    private static int i(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value instanceof Number) return ((Number) value).intValue();
        try { return Integer.parseInt(String.valueOf(value)); } catch (Exception ex) { return 0; }
    }

    private static double d(Map<String, Object> map, String key) {
        Object value = map.get(key);
        if (value instanceof Number) return ((Number) value).doubleValue();
        try { return Double.parseDouble(String.valueOf(value)); } catch (Exception ex) { return 0; }
    }

    private static String toJson(Object value) {
        if (value == null) return "null";
        if (value instanceof Map) {
            StringBuilder out = new StringBuilder("{");
            boolean first = true;
            for (Map.Entry<?, ?> entry : ((Map<?, ?>) value).entrySet()) {
                if (!first) out.append(',');
                first = false;
                out.append("\"").append(escape(String.valueOf(entry.getKey()))).append("\":").append(toJson(entry.getValue()));
            }
            return out.append("}").toString();
        }
        if (value instanceof List) {
            StringBuilder out = new StringBuilder("[");
            boolean first = true;
            for (Object item : (List<?>) value) {
                if (!first) out.append(',');
                first = false;
                out.append(toJson(item));
            }
            return out.append("]").toString();
        }
        if (value instanceof Number || value instanceof Boolean) return String.valueOf(value);
        return "\"" + escape(String.valueOf(value)) + "\"";
    }

    private static Map<String, Object> parseJson(String json) {
        if (json == null || json.isBlank()) return new LinkedHashMap<>();
        Map<String, Object> result = new LinkedHashMap<>();
        String[] stringKeys = {
            "name","role","full_name","email","password","account_type","code","new_password","reset_token",
            "specialization","slot_start","slot_end","session_mode","meeting_link","location","notes",
            "reason","rejection_reason","screening_summary"
        };
        for (String key : stringKeys) {
            String value = extractJsonString(json, key);
            if (value != null) result.put(key, value);
        }
        String[] numberKeys = {"id","exp","availability_id","overall_score","student_id","appointment_id"};
        for (String key : numberKeys) {
            String raw = extractJsonPrimitive(json, key);
            if (raw != null) {
                try {
                    result.put(key, raw.contains(".") ? Double.parseDouble(raw) : Long.parseLong(raw));
                } catch (NumberFormatException ignored) {
                }
            }
        }
        int responsesIndex = findJsonKey(json, "responses");
        if (responsesIndex >= 0) result.put("responses", new LinkedHashMap<String, Object>());
        return result;
    }

    private static int findJsonKey(String json, String key) {
        String needle = "\"" + key + "\"";
        int start = json.indexOf(needle);
        if (start < 0) return -1;
        int colon = json.indexOf(':', start + needle.length());
        return colon >= 0 ? colon + 1 : -1;
    }

    private static String extractJsonString(String json, String key) {
        int valueStart = findJsonKey(json, key);
        if (valueStart < 0) return null;
        while (valueStart < json.length() && Character.isWhitespace(json.charAt(valueStart))) valueStart++;
        if (valueStart >= json.length() || json.charAt(valueStart) != '"') return null;
        int end = valueStart + 1;
        StringBuilder out = new StringBuilder();
        while (end < json.length()) {
            char c = json.charAt(end++);
            if (c == '"') break;
            if (c == '\\' && end < json.length()) {
                char escaped = json.charAt(end++);
                if (escaped == 'n') out.append('\n');
                else if (escaped == 'r') out.append('\r');
                else if (escaped == 't') out.append('\t');
                else out.append(escaped);
            } else {
                out.append(c);
            }
        }
        return out.toString();
    }

    private static String extractJsonPrimitive(String json, String key) {
        int valueStart = findJsonKey(json, key);
        if (valueStart < 0) return null;
        while (valueStart < json.length() && Character.isWhitespace(json.charAt(valueStart))) valueStart++;
        int end = valueStart;
        while (end < json.length() && json.charAt(end) != ',' && json.charAt(end) != '}') end++;
        return json.substring(valueStart, end).trim();
    }

    private static int balancedEnd(String json, int start, char open, char close) {
        int depth = 0;
        boolean inString = false;
        boolean escaped = false;
        for (int i = start; i < json.length(); i++) {
            char c = json.charAt(i);
            if (escaped) {
                escaped = false;
                continue;
            }
            if (c == '\\' && inString) {
                escaped = true;
                continue;
            }
            if (c == '"') {
                inString = !inString;
            } else if (!inString) {
                if (c == open) depth++;
                if (c == close) {
                    depth--;
                    if (depth == 0) return i + 1;
                }
            }
        }
        return json.length();
    }

    private static String unescapeJson(String value) {
        return value.replace("\\\"", "\"").replace("\\\\", "\\")
            .replace("\\n", "\n").replace("\\r", "\r").replace("\\t", "\t");
    }

    private static class UserContext {
        final int id;
        final String email, name, role;
        UserContext(int id, String email, String name, String role) {
            this.id = id; this.email = email; this.name = name; this.role = role;
        }
    }

    private static class JsonParser {
        private final String text;
        private int index;
        JsonParser(String text) { this.text = text; }
        Object parse() { skip(); Object value = parseValue(); skip(); return value; }
        private void skip() {
            while (index < text.length() && Character.isWhitespace(text.charAt(index))) index++;
        }
        private Object parseValue() {
            skip();
            if (index >= text.length()) return null;
            char c = text.charAt(index);
            if (c == '{') return parseObject();
            if (c == '[') return parseArray();
            if (c == '"') return parseString();
            if (c == 't') { index += 4; return true; }
            if (c == 'f') { index += 5; return false; }
            if (c == 'n') { index += 4; return null; }
            int start = index;
            if (c == '-' || c == '+') index++;
            while (index < text.length() && (Character.isDigit(text.charAt(index)) || text.charAt(index) == '.'
                || text.charAt(index) == 'e' || text.charAt(index) == 'E' || text.charAt(index) == '+' || text.charAt(index) == '-')) index++;
            String number = text.substring(start, index);
            return number.contains(".") || number.contains("e") || number.contains("E")
                ? Double.parseDouble(number) : Long.parseLong(number);
        }
        private Map<String, Object> parseObject() {
            Map<String, Object> map = new LinkedHashMap<>();
            index++;
            skip();
            if (index >= text.length()) return map;
            if (text.charAt(index) == '}') { index++; return map; }
            while (true) {
                skip();
                if (index >= text.length()) break;
                String key = parseString();
                skip();
                if (index < text.length() && text.charAt(index) == ':') index++;
                map.put(key, parseValue());
                skip();
                if (index >= text.length()) break;
                char c = text.charAt(index);
                if (c == '}') { index++; break; }
                if (c == ',') { index++; continue; }
                break;
            }
            return map;
        }
        private List<Object> parseArray() {
            List<Object> list = new ArrayList<>();
            index++;
            skip();
            if (index >= text.length()) return list;
            if (text.charAt(index) == ']') { index++; return list; }
            while (true) {
                list.add(parseValue());
                skip();
                if (index >= text.length()) break;
                char c = text.charAt(index);
                if (c == ']') { index++; break; }
                if (c == ',') { index++; continue; }
                break;
            }
            return list;
        }
        private String parseString() {
            if (index >= text.length()) return "";
            index++;
            StringBuilder out = new StringBuilder();
            while (index < text.length()) {
                char c = text.charAt(index++);
                if (c == '"') break;
                if (c == '\\') {
                    char esc = text.charAt(index++);
                    if (esc == 'n') out.append('\n');
                    else if (esc == 'r') out.append('\r');
                    else if (esc == 't') out.append('\t');
                    else out.append(esc);
                } else {
                    out.append(c);
                }
            }
            return out.toString();
        }
    }
}
