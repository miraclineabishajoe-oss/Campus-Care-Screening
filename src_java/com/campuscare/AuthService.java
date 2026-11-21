package com.campuscare;

import org.mindrot.jbcrypt.BCrypt;
import java.sql.*;

public class AuthService {

    private boolean verifyPassword(String password, String storedHash) {
        if (password == null || storedHash == null) return false;
        // Normalize $2b$ and $2y$ to $2a$ for jbcrypt compatibility
        if (storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$")) {
            storedHash = "$2a$" + storedHash.substring(4);
        }
        return BCrypt.checkpw(password, storedHash);
    }

    public Models.User loginStudent(String email, String password) throws Exception {
        String sql = "SELECT student_id, full_name, email, password_hash FROM students WHERE email = ?";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, email.trim().toLowerCase());
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    String hash = rs.getString("password_hash");
                    if (verifyPassword(password, hash)) {
                        return new Models.User(
                            rs.getInt("student_id"),
                            rs.getString("full_name"),
                            rs.getString("email"),
                            "STUDENT"
                        );
                    }
                }
            }
        }
        throw new Exception("Invalid student email or password.");
    }

    public Models.User registerStudent(String fullName, String email, String password) throws Exception {
        if (password.length() < 8) {
            throw new Exception("Password must be at least 8 characters long.");
        }
        String checkSql = "SELECT student_id FROM students WHERE email = ?";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement checkStmt = conn.prepareStatement(checkSql)) {
            checkStmt.setString(1, email.trim().toLowerCase());
            try (ResultSet rs = checkStmt.executeQuery()) {
                if (rs.next()) {
                    throw new Exception("A student account with this email already exists.");
                }
            }
        }

        String hash = BCrypt.hashpw(password, BCrypt.gensalt(10));
        String insertSql = "INSERT INTO students (full_name, email, password_hash) VALUES (?, ?, ?)";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(insertSql, Statement.RETURN_GENERATED_KEYS)) {
            stmt.setString(1, fullName.trim());
            stmt.setString(2, email.trim().toLowerCase());
            stmt.setString(3, hash);
            stmt.executeUpdate();
            try (ResultSet keys = stmt.getGeneratedKeys()) {
                if (keys.next()) {
                    return new Models.User(keys.getInt(1), fullName.trim(), email.trim().toLowerCase(), "STUDENT");
                }
            }
        }
        throw new Exception("Failed to create student account.");
    }

    public Models.User loginCounsellor(String email, String password) throws Exception {
        String sql = "SELECT counsellor_id, full_name, email, specialization, password_hash, is_active FROM counsellors WHERE email = ?";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, email.trim().toLowerCase());
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    String hash = rs.getString("password_hash");
                    if (verifyPassword(password, hash)) {
                        int isActive = rs.getInt("is_active");
                        if (isActive != 1) {
                            throw new Exception("Account pending administrative verification. Active authorization required.");
                        }
                        Models.User u = new Models.User(
                            rs.getInt("counsellor_id"),
                            rs.getString("full_name"),
                            rs.getString("email"),
                            "COUNSELLOR"
                        );
                        u.specialization = rs.getString("specialization");
                        u.isActive = isActive;
                        return u;
                    }
                }
            }
        }
        throw new Exception("Invalid counsellor credentials or password.");
    }

    public void registerCounsellor(String fullName, String email, String specialization, String password) throws Exception {
        if (password.length() < 8) {
            throw new Exception("Password must be at least 8 characters long.");
        }
        String checkSql = "SELECT counsellor_id FROM counsellors WHERE email = ?";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement checkStmt = conn.prepareStatement(checkSql)) {
            checkStmt.setString(1, email.trim().toLowerCase());
            try (ResultSet rs = checkStmt.executeQuery()) {
                if (rs.next()) {
                    throw new Exception("A counsellor account with this email already exists.");
                }
            }
        }

        String hash = BCrypt.hashpw(password, BCrypt.gensalt(10));
        String insertSql = "INSERT INTO counsellors (full_name, email, specialization, password_hash, is_active) VALUES (?, ?, ?, ?, 0)";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(insertSql)) {
            stmt.setString(1, fullName.trim());
            stmt.setString(2, email.trim().toLowerCase());
            stmt.setString(3, specialization.trim());
            stmt.setString(4, hash);
            stmt.executeUpdate();
        }
    }
}
