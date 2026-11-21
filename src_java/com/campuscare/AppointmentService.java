package com.campuscare;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class AppointmentService {

    // ---------------------------------------------------------
    // STUDENT: AVAILABLE SLOTS
    // ---------------------------------------------------------
    public List<Models.AvailabilitySlot> getAvailableSlots() throws SQLException {
        List<Models.AvailabilitySlot> list = new ArrayList<>();
        String sql = "SELECT ca.availability_id, ca.counsellor_id, ca.slot_start, ca.slot_end, ca.is_available, " +
                     "ca.session_mode, ca.meeting_link, ca.location, ca.notes, " +
                     "c.full_name AS counsellor_name, c.specialization " +
                     "FROM counsellor_availability ca " +
                     "JOIN counsellors c ON ca.counsellor_id = c.counsellor_id " +
                     "WHERE ca.is_available = 1 AND ca.slot_start > NOW() " +
                     "ORDER BY ca.slot_start ASC";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql);
             ResultSet rs = stmt.executeQuery()) {
            while (rs.next()) {
                Models.AvailabilitySlot s = new Models.AvailabilitySlot(
                    rs.getInt("availability_id"),
                    rs.getInt("counsellor_id"),
                    rs.getTimestamp("slot_start"),
                    rs.getTimestamp("slot_end"),
                    rs.getInt("is_available") == 1
                );
                s.counsellorName = rs.getString("counsellor_name");
                s.specialization = rs.getString("specialization");
                s.sessionMode = rs.getString("session_mode");
                s.meetingLink = rs.getString("meeting_link");
                s.location = rs.getString("location");
                s.notes = rs.getString("notes");
                if (s.sessionMode == null) s.sessionMode = "OFFLINE";
                list.add(s);
            }
        }
        return list;
    }

    // ---------------------------------------------------------
    // STUDENT: BOOK APPOINTMENT (ATOMIC CONCURRENCY LOCKING)
    // ---------------------------------------------------------
    public int bookAppointment(int studentId, int availabilityId, String reason, String mode, String meetingLink, String location) throws Exception {
        try (Connection conn = DBConnection.getConnection()) {
            conn.setAutoCommit(false);
            try {
                // 1. Lock slot row with FOR UPDATE
                String lockSql = "SELECT availability_id, is_available, slot_start FROM counsellor_availability WHERE availability_id = ? FOR UPDATE";
                try (PreparedStatement lockStmt = conn.prepareStatement(lockSql)) {
                    lockStmt.setInt(1, availabilityId);
                    try (ResultSet rs = lockStmt.executeQuery()) {
                        if (!rs.next()) {
                            throw new Exception("Selected availability slot not found.");
                        }
                        if (rs.getInt("is_available") != 1) {
                            throw new Exception("This slot has already been reserved by another student.");
                        }
                        if (rs.getTimestamp("slot_start").before(new Timestamp(System.currentTimeMillis()))) {
                            throw new Exception("Cannot book appointment slots in the past.");
                        }
                    }
                }

                // 2. Format serialized reason
                String cleanMode = "ONLINE".equalsIgnoreCase(mode) ? "ONLINE" : "OFFLINE";
                String encodedReason = "STATUS:PENDING | MODE:" + cleanMode + " | REASON:" + (reason != null ? reason : "Wellness Check-in");
                if ("ONLINE".equals(cleanMode) && meetingLink != null) {
                    encodedReason += " | LINK:" + meetingLink;
                } else if (location != null) {
                    encodedReason += " | ROOM:" + location;
                }

                // 3. Insert into appointments with active_availability_id constraint
                String insertSql = "INSERT INTO appointments (student_id, availability_id, booking_status, reason, active_availability_id) VALUES (?, ?, 'BOOKED', ?, ?)";
                int apptId = 0;
                try (PreparedStatement insertStmt = conn.prepareStatement(insertSql, Statement.RETURN_GENERATED_KEYS)) {
                    insertStmt.setInt(1, studentId);
                    insertStmt.setInt(2, availabilityId);
                    insertStmt.setString(3, encodedReason);
                    insertStmt.setInt(4, availabilityId);
                    insertStmt.executeUpdate();
                    try (ResultSet keys = insertStmt.getGeneratedKeys()) {
                        if (keys.next()) apptId = keys.getInt(1);
                    }
                }

                // 4. Mark slot reserved
                String updateSlotSql = "UPDATE counsellor_availability SET is_available = 0 WHERE availability_id = ?";
                try (PreparedStatement updateSlotStmt = conn.prepareStatement(updateSlotSql)) {
                    updateSlotStmt.setInt(1, availabilityId);
                    updateSlotStmt.executeUpdate();
                }

                conn.commit();
                return apptId;
            } catch (Exception ex) {
                conn.rollback();
                throw ex;
            } finally {
                conn.setAutoCommit(true);
            }
        }
    }

    // ---------------------------------------------------------
    // STUDENT: GET APPOINTMENTS
    // ---------------------------------------------------------
    public List<Models.Appointment> getStudentAppointments(int studentId) throws SQLException {
        List<Models.Appointment> list = new ArrayList<>();
        String sql = "SELECT a.appointment_id, a.student_id, a.availability_id, a.booking_status, a.reason, " +
                     "ca.slot_start, ca.slot_end, c.full_name AS counsellor_name " +
                     "FROM appointments a " +
                     "JOIN counsellor_availability ca ON a.availability_id = ca.availability_id " +
                     "JOIN counsellors c ON ca.counsellor_id = c.counsellor_id " +
                     "WHERE a.student_id = ? " +
                     "ORDER BY ca.slot_start DESC";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, studentId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    Models.Appointment appt = parseAppointmentRow(rs);
                    appt.counsellorName = rs.getString("counsellor_name");
                    // Privacy Gate: If student and status is PENDING, hide meeting link
                    if (!"CONFIRMED".equalsIgnoreCase(appt.workflowStatus)) {
                        appt.meetingLink = null;
                    }
                    list.add(appt);
                }
            }
        }
        return list;
    }

    // ---------------------------------------------------------
    // COUNSELLOR: GET APPOINTMENTS & REQUESTS
    // ---------------------------------------------------------
    public List<Models.Appointment> getCounsellorAppointments(int counsellorId) throws SQLException {
        List<Models.Appointment> list = new ArrayList<>();
        String sql = "SELECT a.appointment_id, a.student_id, a.availability_id, a.booking_status, a.reason, " +
                     "ca.slot_start, ca.slot_end, s.full_name AS student_name, s.email AS student_email " +
                     "FROM appointments a " +
                     "JOIN counsellor_availability ca ON a.availability_id = ca.availability_id " +
                     "JOIN students s ON a.student_id = s.student_id " +
                     "WHERE ca.counsellor_id = ? " +
                     "ORDER BY ca.slot_start DESC";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, counsellorId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    Models.Appointment appt = parseAppointmentRow(rs);
                    appt.studentName = rs.getString("student_name");
                    appt.studentEmail = rs.getString("student_email");
                    list.add(appt);
                }
            }
        }
        return list;
    }

    // ---------------------------------------------------------
    // WORKFLOW: ACCEPT REQUEST (CONFIRM)
    // ---------------------------------------------------------
    public void acceptRequest(int appointmentId) throws Exception {
        String querySql = "SELECT reason FROM appointments WHERE appointment_id = ?";
        String updateSql = "UPDATE appointments SET reason = ? WHERE appointment_id = ?";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement qStmt = conn.prepareStatement(querySql)) {
            qStmt.setInt(1, appointmentId);
            try (ResultSet rs = qStmt.executeQuery()) {
                if (!rs.next()) throw new Exception("Appointment not found.");
                String currentReason = rs.getString("reason");
                String updatedReason = currentReason.replace("STATUS:PENDING", "STATUS:CONFIRMED");
                if (!updatedReason.contains("STATUS:CONFIRMED")) {
                    updatedReason = "STATUS:CONFIRMED | " + currentReason;
                }

                try (PreparedStatement uStmt = conn.prepareStatement(updateSql)) {
                    uStmt.setString(1, updatedReason);
                    uStmt.setInt(2, appointmentId);
                    uStmt.executeUpdate();
                }
            }
        }
    }

    // ---------------------------------------------------------
    // WORKFLOW: REJECT REQUEST (REOPENS SLOT)
    // ---------------------------------------------------------
    public void rejectRequest(int appointmentId, String rejectionNote) throws Exception {
        try (Connection conn = DBConnection.getConnection()) {
            conn.setAutoCommit(false);
            try {
                // Find availability_id
                int slotId = 0;
                String currentReason = "";
                String selectSql = "SELECT availability_id, reason FROM appointments WHERE appointment_id = ?";
                try (PreparedStatement sStmt = conn.prepareStatement(selectSql)) {
                    sStmt.setInt(1, appointmentId);
                    try (ResultSet rs = sStmt.executeQuery()) {
                        if (!rs.next()) throw new Exception("Appointment not found.");
                        slotId = rs.getInt("availability_id");
                        currentReason = rs.getString("reason");
                    }
                }

                String updatedReason = currentReason.replace("STATUS:PENDING", "STATUS:REJECTED") + " | REJECTED: " + (rejectionNote != null ? rejectionNote : "Unavailable");

                // Update appointment to CANCELLED and clear active_availability_id to free unique lock
                String updateApptSql = "UPDATE appointments SET booking_status = 'CANCELLED', active_availability_id = NULL, reason = ? WHERE appointment_id = ?";
                try (PreparedStatement uStmt = conn.prepareStatement(updateApptSql)) {
                    uStmt.setString(1, updatedReason);
                    uStmt.setInt(2, appointmentId);
                    uStmt.executeUpdate();
                }

                // Reopen slot
                String reopenSql = "UPDATE counsellor_availability SET is_available = 1 WHERE availability_id = ?";
                try (PreparedStatement rStmt = conn.prepareStatement(reopenSql)) {
                    rStmt.setInt(1, slotId);
                    rStmt.executeUpdate();
                }

                conn.commit();
            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        }
    }

    // ---------------------------------------------------------
    // WORKFLOW: CANCEL APPOINTMENT
    // ---------------------------------------------------------
    public void cancelAppointment(int appointmentId) throws Exception {
        try (Connection conn = DBConnection.getConnection()) {
            conn.setAutoCommit(false);
            try {
                int slotId = 0;
                String selectSql = "SELECT availability_id FROM appointments WHERE appointment_id = ?";
                try (PreparedStatement sStmt = conn.prepareStatement(selectSql)) {
                    sStmt.setInt(1, appointmentId);
                    try (ResultSet rs = sStmt.executeQuery()) {
                        if (!rs.next()) throw new Exception("Appointment not found.");
                        slotId = rs.getInt("availability_id");
                    }
                }

                String updateApptSql = "UPDATE appointments SET booking_status = 'CANCELLED', active_availability_id = NULL WHERE appointment_id = ?";
                try (PreparedStatement uStmt = conn.prepareStatement(updateApptSql)) {
                    uStmt.setInt(1, appointmentId);
                    uStmt.executeUpdate();
                }

                String reopenSql = "UPDATE counsellor_availability SET is_available = 1 WHERE availability_id = ?";
                try (PreparedStatement rStmt = conn.prepareStatement(reopenSql)) {
                    rStmt.setInt(1, slotId);
                    rStmt.executeUpdate();
                }

                conn.commit();
            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        }
    }

    // ---------------------------------------------------------
    // COUNSELLOR: CREATE AVAILABILITY SLOT (OVERLAP CHECK)
    // ---------------------------------------------------------
    public void createSlot(int counsellorId, Timestamp start, Timestamp end, String mode, String meetingLink, String location, String notes) throws Exception {
        if (end.before(start) || end.equals(start)) {
            throw new Exception("Slot end time must be after start time.");
        }
        if (start.before(new Timestamp(System.currentTimeMillis() - 60000))) {
            throw new Exception("Cannot create slots in the past.");
        }

        try (Connection conn = DBConnection.getConnection()) {
            // Check overlap
            String overlapSql = "SELECT availability_id FROM counsellor_availability " +
                                "WHERE counsellor_id = ? " +
                                "AND ((slot_start < ? AND slot_end > ?) OR (slot_start >= ? AND slot_start < ?))";
            try (PreparedStatement oStmt = conn.prepareStatement(overlapSql)) {
                oStmt.setInt(1, counsellorId);
                oStmt.setTimestamp(2, end);
                oStmt.setTimestamp(3, start);
                oStmt.setTimestamp(4, start);
                oStmt.setTimestamp(5, end);
                try (ResultSet rs = oStmt.executeQuery()) {
                    if (rs.next()) {
                        throw new Exception("You already have an availability slot overlapping with this time period.");
                    }
                }
            }

            String cleanMode = "ONLINE".equalsIgnoreCase(mode) ? "ONLINE" : "OFFLINE";
            if ("ONLINE".equals(cleanMode)) {
                if (meetingLink == null || meetingLink.trim().isEmpty()) {
                    throw new Exception("A meeting link is required for online sessions.");
                }
            } else if (location == null || location.trim().isEmpty()) {
                location = "Counselling Room 204";
            }

            String insertSql = "INSERT INTO counsellor_availability "
                + "(counsellor_id, slot_start, slot_end, is_available, session_mode, meeting_link, location, notes) "
                + "VALUES (?, ?, ?, 1, ?, ?, ?, ?)";
            try (PreparedStatement iStmt = conn.prepareStatement(insertSql)) {
                iStmt.setInt(1, counsellorId);
                iStmt.setTimestamp(2, start);
                iStmt.setTimestamp(3, end);
                iStmt.setString(4, cleanMode);
                iStmt.setString(5, "ONLINE".equals(cleanMode) ? meetingLink.trim() : null);
                iStmt.setString(6, "OFFLINE".equals(cleanMode) ? location.trim() : null);
                iStmt.setString(7, notes);
                iStmt.executeUpdate();
            }
        }
    }

    // ---------------------------------------------------------
    // COUNSELLOR: DELETE AVAILABILITY SLOT
    // ---------------------------------------------------------
    public void deleteSlot(int availabilityId, int counsellorId) throws Exception {
        try (Connection conn = DBConnection.getConnection()) {
            // Check active bookings
            String checkSql = "SELECT appointment_id FROM appointments WHERE availability_id = ? AND booking_status = 'BOOKED'";
            try (PreparedStatement cStmt = conn.prepareStatement(checkSql)) {
                cStmt.setInt(1, availabilityId);
                try (ResultSet rs = cStmt.executeQuery()) {
                    if (rs.next()) {
                        throw new Exception("Cannot remove a slot that is currently booked by a student. Cancel appointment first.");
                    }
                }
            }

            // Close availability or delete
            String updateSql = "UPDATE counsellor_availability SET is_available = 0 WHERE availability_id = ? AND counsellor_id = ?";
            try (PreparedStatement uStmt = conn.prepareStatement(updateSql)) {
                uStmt.setInt(1, availabilityId);
                uStmt.setInt(2, counsellorId);
                int affected = uStmt.executeUpdate();
                if (affected == 0) throw new Exception("Slot not found or unauthorized to delete.");
            }
        }
    }

    // ---------------------------------------------------------
    // SCREENINGS: SUBMIT & HISTORY
    // ---------------------------------------------------------
    public void submitScreening(int studentId, double overallScore, String summary) throws SQLException {
        String sql = "INSERT INTO screenings (student_id, responses, overall_score, screening_summary) VALUES (?, '{}', ?, ?)";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, studentId);
            stmt.setDouble(2, overallScore);
            stmt.setString(3, summary);
            stmt.executeUpdate();
        }
    }

    public List<Models.Screening> getStudentScreenings(int studentId) throws SQLException {
        List<Models.Screening> list = new ArrayList<>();
        String sql = "SELECT screening_id, student_id, overall_score, screening_summary, submitted_at FROM screenings WHERE student_id = ? ORDER BY submitted_at DESC";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, studentId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    list.add(new Models.Screening(
                        rs.getInt("screening_id"),
                        rs.getInt("student_id"),
                        rs.getDouble("overall_score"),
                        rs.getString("screening_summary"),
                        rs.getTimestamp("submitted_at")
                    ));
                }
            }
        }
        return list;
    }

    // ---------------------------------------------------------
    // COUNSELLOR: GET AVAILABILITY SLOTS
    // ---------------------------------------------------------
    public List<Models.AvailabilitySlot> getCounsellorAvailabilitySlots(int counsellorId) throws SQLException {
        List<Models.AvailabilitySlot> list = new ArrayList<>();
        String sql = "SELECT availability_id, counsellor_id, slot_start, slot_end, is_available, " +
                     "session_mode, meeting_link, location, notes " +
                     "FROM counsellor_availability " +
                     "WHERE counsellor_id = ? " +
                     "ORDER BY slot_start DESC";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, counsellorId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    Models.AvailabilitySlot s = new Models.AvailabilitySlot(
                        rs.getInt("availability_id"),
                        rs.getInt("counsellor_id"),
                        rs.getTimestamp("slot_start"),
                        rs.getTimestamp("slot_end"),
                        rs.getInt("is_available") == 1
                    );
                    s.sessionMode = rs.getString("session_mode");
                    s.meetingLink = rs.getString("meeting_link");
                    s.location = rs.getString("location");
                    s.notes = rs.getString("notes");
                    if (s.sessionMode == null) s.sessionMode = "OFFLINE";
                    list.add(s);
                }
            }
        }
        return list;
    }

    // ---------------------------------------------------------
    // COUNSELLOR: COMPLETE APPOINTMENT
    // ---------------------------------------------------------
    public void completeAppointment(int appointmentId) throws Exception {
        String sql = "UPDATE appointments SET booking_status = 'COMPLETED' WHERE appointment_id = ?";
        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, appointmentId);
            stmt.executeUpdate();
        }
    }

    // ---------------------------------------------------------
    // COUNSELLOR: AUTHORIZED CASELOAD
    // ---------------------------------------------------------
    public List<Models.AuthorizedStudent> getAuthorizedStudents(int counsellorId) throws SQLException {
        List<Models.AuthorizedStudent> list = new ArrayList<>();
        String sql = "SELECT s.student_id, s.full_name, s.email, " +
                     "COUNT(a.appointment_id) AS total_sessions, " +
                     "MAX(ca.slot_start) AS latest_session_date " +
                     "FROM students s " +
                     "JOIN appointments a ON s.student_id = a.student_id " +
                     "JOIN counsellor_availability ca ON a.availability_id = ca.availability_id " +
                     "WHERE ca.counsellor_id = ? AND a.booking_status != 'CANCELLED' " +
                     "GROUP BY s.student_id, s.full_name, s.email " +
                     "ORDER BY latest_session_date DESC";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, counsellorId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    list.add(new Models.AuthorizedStudent(
                        rs.getInt("student_id"),
                        rs.getString("full_name"),
                        rs.getString("email"),
                        rs.getInt("total_sessions"),
                        rs.getTimestamp("latest_session_date")
                    ));
                }
            }
        }
        return list;
    }

    // ---------------------------------------------------------
    // COUNSELLOR: GET AUTHORIZED STUDENT SCREENINGS (CLINICAL PRIVACY GATE)
    // ---------------------------------------------------------
    public List<Models.Screening> getAuthorizedStudentScreenings(int counsellorId, int studentId) throws Exception {
        String authSql = "SELECT 1 FROM appointments a " +
                         "JOIN counsellor_availability ca ON a.availability_id = ca.availability_id " +
                         "WHERE ca.counsellor_id = ? AND a.student_id = ? LIMIT 1";

        try (Connection conn = DBConnection.getConnection();
             PreparedStatement authStmt = conn.prepareStatement(authSql)) {
            authStmt.setInt(1, counsellorId);
            authStmt.setInt(2, studentId);
            try (ResultSet rs = authStmt.executeQuery()) {
                if (!rs.next()) {
                    throw new Exception("Clinical Privacy Policy: You are not authorized to view screening records for this student without an active appointment consultation.");
                }
            }
        }
        return getStudentScreenings(studentId);
    }

    // ---------------------------------------------------------
    // CLINICAL ANALYTICS & METRICS
    // ---------------------------------------------------------
    public Models.ClinicalAnalytics getCounsellorAnalytics(int counsellorId) throws SQLException {
        Models.ClinicalAnalytics stats = new Models.ClinicalAnalytics();
        try (Connection conn = DBConnection.getConnection()) {
            // Total students
            try (PreparedStatement s = conn.prepareStatement("SELECT COUNT(*) FROM students");
                 ResultSet rs = s.executeQuery()) {
                if (rs.next()) stats.totalStudents = rs.getInt(1);
            }

            // Screenings aggregates
            try (PreparedStatement s = conn.prepareStatement(
                    "SELECT COUNT(*) AS total_screenings, AVG(overall_score) AS avg_score, " +
                    "SUM(CASE WHEN overall_score <= 4 THEN 1 ELSE 0 END) AS low_count, " +
                    "SUM(CASE WHEN overall_score > 4 AND overall_score <= 10 THEN 1 ELSE 0 END) AS mod_count, " +
                    "SUM(CASE WHEN overall_score > 10 THEN 1 ELSE 0 END) AS high_count " +
                    "FROM screenings");
                 ResultSet rs = s.executeQuery()) {
                if (rs.next()) {
                    stats.totalScreenings = rs.getInt("total_screenings");
                    stats.averageScore = rs.getDouble("avg_score");
                    stats.lowDistressCount = rs.getInt("low_count");
                    stats.moderateDistressCount = rs.getInt("mod_count");
                    stats.highDistressCount = rs.getInt("high_count");
                }
            }

            // Counsellor's slots
            try (PreparedStatement s = conn.prepareStatement(
                    "SELECT COUNT(*) AS total_slots, " +
                    "SUM(CASE WHEN is_available = 1 AND slot_start > NOW() THEN 1 ELSE 0 END) AS active_slots " +
                    "FROM counsellor_availability WHERE counsellor_id = ?")) {
                s.setInt(1, counsellorId);
                try (ResultSet rs = s.executeQuery()) {
                    if (rs.next()) {
                        stats.counsellorTotalSlots = rs.getInt("total_slots");
                        stats.counsellorActiveSlots = rs.getInt("active_slots");
                    }
                }
            }

            // Counsellor's appointments
            try (PreparedStatement s = conn.prepareStatement(
                    "SELECT a.booking_status, a.reason FROM appointments a " +
                    "JOIN counsellor_availability ca ON a.availability_id = ca.availability_id " +
                    "WHERE ca.counsellor_id = ?")) {
                s.setInt(1, counsellorId);
                try (ResultSet rs = s.executeQuery()) {
                    while (rs.next()) {
                        String bStatus = rs.getString("booking_status");
                        String reason = rs.getString("reason");
                        if ("COMPLETED".equalsIgnoreCase(bStatus)) {
                            stats.counsellorCompletedAppts++;
                        } else if ("BOOKED".equalsIgnoreCase(bStatus)) {
                            if (reason != null && reason.contains("STATUS:PENDING")) {
                                stats.counsellorPendingRequests++;
                            } else {
                                stats.counsellorConfirmedAppts++;
                            }
                        }
                    }
                }
            }
        }
        return stats;
    }

    private Models.Appointment parseAppointmentRow(ResultSet rs) throws SQLException {
        Models.Appointment appt = new Models.Appointment();
        appt.appointmentId = rs.getInt("appointment_id");
        appt.studentId = rs.getInt("student_id");
        appt.availabilityId = rs.getInt("availability_id");
        appt.bookingStatus = rs.getString("booking_status");
        appt.slotStart = rs.getTimestamp("slot_start");
        appt.slotEnd = rs.getTimestamp("slot_end");
        appt.reason = rs.getString("reason");

        // Parse reason string metadata
        String r = appt.reason != null ? appt.reason : "";
        if (r.contains("STATUS:PENDING")) {
            appt.workflowStatus = "PENDING";
        } else if (r.contains("STATUS:CONFIRMED")) {
            appt.workflowStatus = "CONFIRMED";
        } else if (r.contains("STATUS:REJECTED")) {
            appt.workflowStatus = "REJECTED";
        } else {
            appt.workflowStatus = "COMPLETED".equals(appt.bookingStatus) ? "COMPLETED" : "CONFIRMED";
        }

        appt.sessionMode = r.contains("MODE:ONLINE") ? "ONLINE" : "OFFLINE";
        if (r.contains("LINK:")) {
            int idx = r.indexOf("LINK:") + 5;
            int endIdx = r.indexOf(" |", idx);
            appt.meetingLink = endIdx != -1 ? r.substring(idx, endIdx).trim() : r.substring(idx).trim();
        }
        if (r.contains("ROOM:")) {
            int idx = r.indexOf("ROOM:") + 5;
            int endIdx = r.indexOf(" |", idx);
            appt.location = endIdx != -1 ? r.substring(idx, endIdx).trim() : r.substring(idx).trim();
        } else {
            appt.location = "Counselling Room 204";
        }

        return appt;
    }
}
