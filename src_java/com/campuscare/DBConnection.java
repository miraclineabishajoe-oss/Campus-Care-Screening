package com.campuscare;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.ResultSet;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

public class DBConnection {
    private static final Properties ENV = loadEnvironment();
    private static final String URL = env("DB_URL",
        "jdbc:mysql://" + env("MYSQL_HOST", "localhost") + ":" + env("MYSQL_PORT", "3306")
            + "/" + env("MYSQL_DATABASE", "campuscare")
            + "?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC");
    private static final String USER = env("DB_USER", env("MYSQL_USER", "root"));
    private static final String PASSWORD = env("DB_PASSWORD", env("MYSQL_PASSWORD", ""));

    static {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            System.err.println("[CampusCare Java] MySQL JDBC Driver not found: " + e.getMessage());
        }
    }

    private static Properties loadEnvironment() {
        Properties properties = new Properties();
        Path envFile = Path.of(".env");
        if (Files.exists(envFile)) {
            try {
                Files.readAllLines(envFile).forEach(line -> {
                    String trimmed = line.trim();
                    if (!trimmed.isEmpty() && !trimmed.startsWith("#") && trimmed.contains("=")) {
                        int separator = trimmed.indexOf('=');
                        String key = trimmed.substring(0, separator).trim();
                        String value = trimmed.substring(separator + 1).trim();
                        if (value.length() >= 2
                            && ((value.startsWith("\"") && value.endsWith("\""))
                                || (value.startsWith("'") && value.endsWith("'")))) {
                            value = value.substring(1, value.length() - 1);
                        }
                        properties.setProperty(key, value);
                    }
                });
            } catch (Exception ignored) {
            }
        }
        return properties;
    }

    private static String env(String name, String fallback) {
        String value = System.getenv(name);
        if (value != null && !value.isBlank()) {
            return value;
        }
        value = ENV.getProperty(name);
        return value == null || value.isBlank() ? fallback : value;
    }

    public static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(URL, USER, PASSWORD);
    }

    public static void ensureAvailabilityMetadataSchema() throws SQLException {
        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {
            String[][] changes = {
                {"session_mode", "ALTER TABLE counsellor_availability ADD COLUMN session_mode VARCHAR(10) NOT NULL DEFAULT 'OFFLINE'"},
                {"meeting_link", "ALTER TABLE counsellor_availability ADD COLUMN meeting_link VARCHAR(500) NULL"},
                {"location", "ALTER TABLE counsellor_availability ADD COLUMN location VARCHAR(200) NULL"},
                {"notes", "ALTER TABLE counsellor_availability ADD COLUMN notes VARCHAR(500) NULL"}
            };
            for (String[] change : changes) {
                boolean exists = false;
                try (ResultSet rs = stmt.executeQuery(
                    "SHOW COLUMNS FROM counsellor_availability LIKE '" + change[0] + "'")) {
                    exists = rs.next();
                }
                if (!exists) {
                    stmt.executeUpdate(change[1]);
                }
            }
        }
    }

    public static boolean testConnection() {
        try (Connection conn = getConnection()) {
            return conn != null && !conn.isClosed();
        } catch (SQLException e) {
            System.err.println("[CampusCare Java] Connection test failed: " + e.getMessage());
            return false;
        }
    }
}
