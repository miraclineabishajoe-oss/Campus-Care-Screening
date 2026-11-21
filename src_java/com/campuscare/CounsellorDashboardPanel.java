package com.campuscare;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.List;

public class CounsellorDashboardPanel extends JPanel {
    private final Models.User counsellor;
    private final AppointmentService service;
    private final MainApp mainApp;
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm");
    private final SimpleDateFormat dayFormat = new SimpleDateFormat("yyyy-MM-dd");

    // Overview metric labels
    private JLabel pendingRequestsLabel;
    private JLabel confirmedSessionsLabel;
    private JLabel completedSessionsLabel;
    private JLabel activeSlotsLabel;
    private JLabel totalScreeningsLabel;

    // Tables & Models
    private JTable requestsTable;
    private DefaultTableModel requestsModel;
    private JTable slotsTable;
    private DefaultTableModel slotsModel;
    private JTable caseloadTable;
    private DefaultTableModel caseloadModel;

    // Analytics labels
    private JLabel campusTotalStudentsLabel;
    private JLabel campusTotalScreeningsLabel;
    private JLabel campusAvgScoreLabel;
    private JLabel lowRiskLabel;
    private JLabel modRiskLabel;
    private JLabel highRiskLabel;

    public CounsellorDashboardPanel(Models.User counsellor, MainApp mainApp) {
        this.counsellor = counsellor;
        this.mainApp = mainApp;
        this.service = new AppointmentService();

        setLayout(new BorderLayout(10, 10));
        setBorder(BorderFactory.createEmptyBorder(15, 20, 15, 20));
        setBackground(new Color(250, 248, 245));

        // Top Header
        JPanel headerPanel = new JPanel(new BorderLayout());
        headerPanel.setBackground(new Color(250, 248, 245));

        JPanel titleBox = new JPanel(new GridLayout(2, 1));
        titleBox.setBackground(new Color(250, 248, 245));

        JLabel titleLabel = new JLabel("Counsellor Portal — " + counsellor.fullName + " (" + (counsellor.specialization != null ? counsellor.specialization : "Clinical Wellness") + ")");
        titleLabel.setFont(new Font("SansSerif", Font.BOLD, 18));
        titleLabel.setForeground(new Color(35, 30, 44));

        JLabel subLabel = new JLabel("Authorized Staff ID #" + counsellor.id + " · Active Clinical Status: VERIFIED · " + counsellor.email);
        subLabel.setFont(new Font("SansSerif", Font.PLAIN, 12));
        subLabel.setForeground(new Color(83, 75, 98));

        titleBox.add(titleLabel);
        titleBox.add(subLabel);

        JButton logoutBtn = new JButton("Sign Out");
        logoutBtn.setBackground(new Color(239, 234, 248));
        logoutBtn.setFont(new Font("SansSerif", Font.BOLD, 12));
        logoutBtn.addActionListener(e -> mainApp.showLoginScreen());

        headerPanel.add(titleBox, BorderLayout.WEST);
        headerPanel.add(logoutBtn, BorderLayout.EAST);
        add(headerPanel, BorderLayout.NORTH);

        // Tabbed navigation
        JTabbedPane tabbedPane = new JTabbedPane();
        tabbedPane.setFont(new Font("SansSerif", Font.BOLD, 13));

        tabbedPane.addTab("Dashboard Overview", createOverviewTab(tabbedPane));
        tabbedPane.addTab("Booking Requests & Appointments", createRequestsTab());
        tabbedPane.addTab("Manage Availability Slots", createSlotsTab());
        tabbedPane.addTab("Authorized Student Caseload", createCaseloadTab());
        tabbedPane.addTab("Clinical Reports & Analytics", createAnalyticsTab());

        add(tabbedPane, BorderLayout.CENTER);

        // Load initial data
        refreshAllData();
    }

    // -------------------------------------------------------------
    // TAB 1: OVERVIEW & SUMMARY METRICS
    // -------------------------------------------------------------
    private JPanel createOverviewTab(JTabbedPane tabbedPane) {
        JPanel panel = new JPanel(new BorderLayout(15, 15));
        panel.setBackground(Color.WHITE);
        panel.setBorder(BorderFactory.createEmptyBorder(20, 20, 20, 20));

        // Metric Cards Grid
        JPanel cardsGrid = new JPanel(new GridLayout(1, 4, 15, 15));
        cardsGrid.setBackground(Color.WHITE);

        pendingRequestsLabel = new JLabel("0", SwingConstants.CENTER);
        pendingRequestsLabel.setFont(new Font("SansSerif", Font.BOLD, 28));
        pendingRequestsLabel.setForeground(new Color(180, 83, 9)); // Amber

        confirmedSessionsLabel = new JLabel("0", SwingConstants.CENTER);
        confirmedSessionsLabel.setFont(new Font("SansSerif", Font.BOLD, 28));
        confirmedSessionsLabel.setForeground(new Color(29, 94, 64)); // Green

        completedSessionsLabel = new JLabel("0", SwingConstants.CENTER);
        completedSessionsLabel.setFont(new Font("SansSerif", Font.BOLD, 28));
        completedSessionsLabel.setForeground(new Color(84, 62, 130)); // Purple

        activeSlotsLabel = new JLabel("0", SwingConstants.CENTER);
        activeSlotsLabel.setFont(new Font("SansSerif", Font.BOLD, 28));
        activeSlotsLabel.setForeground(new Color(30, 64, 175)); // Blue

        cardsGrid.add(createMetricCard("Pending Booking Requests", pendingRequestsLabel, new Color(254, 243, 199)));
        cardsGrid.add(createMetricCard("Confirmed Appointments", confirmedSessionsLabel, new Color(224, 244, 234)));
        cardsGrid.add(createMetricCard("Completed Consultations", completedSessionsLabel, new Color(239, 234, 248)));
        cardsGrid.add(createMetricCard("Active Published Slots", activeSlotsLabel, new Color(219, 234, 254)));

        panel.add(cardsGrid, BorderLayout.NORTH);

        // Center Quick-Navigation Panel
        JPanel centerPanel = new JPanel(new BorderLayout(10, 10));
        centerPanel.setBackground(Color.WHITE);

        JPanel infoCard = new JPanel(new BorderLayout(10, 10));
        infoCard.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(new Color(220, 220, 225)),
            BorderFactory.createEmptyBorder(20, 20, 20, 20)
        ));
        infoCard.setBackground(new Color(250, 248, 245));

        JLabel infoTitle = new JLabel("Clinical Coordination Guidelines & Protocol");
        infoTitle.setFont(new Font("SansSerif", Font.BOLD, 15));
        infoTitle.setForeground(new Color(35, 30, 44));

        JTextArea infoText = new JTextArea(
            "• Consultation Requests: Review student bookings in 'Booking Requests'. When accepted, the appointment status is marked CONFIRMED and the confidential meeting link / location is unlocked for the student.\n\n" +
            "• Request Rejections: If you are unavailable or have an emergency, rejecting a request cancels the appointment and immediately reopens your availability slot for other students.\n\n" +
            "• Slot Management: You can create new Online or In-Person consultation windows with automated overlap protection.\n\n" +
            "• Student Privacy Protection: Clinical mental health screening records are strictly gated and visible only for students who have booked appointments with you."
        );
        infoText.setWrapStyleWord(true);
        infoText.setLineWrap(true);
        infoText.setEditable(false);
        infoText.setBackground(new Color(250, 248, 245));
        infoText.setFont(new Font("SansSerif", Font.PLAIN, 13));
        infoText.setForeground(new Color(60, 50, 75));

        JPanel quickActions = new JPanel(new FlowLayout(FlowLayout.LEFT, 15, 10));
        quickActions.setBackground(new Color(250, 248, 245));

        JButton navRequestsBtn = new JButton("Review Pending Requests");
        navRequestsBtn.setFont(new Font("SansSerif", Font.BOLD, 12));
        navRequestsBtn.setBackground(new Color(84, 62, 130));
        navRequestsBtn.setForeground(Color.WHITE);
        navRequestsBtn.addActionListener(e -> tabbedPane.setSelectedIndex(1));

        JButton navSlotsBtn = new JButton("Publish Availability Slots");
        navSlotsBtn.setFont(new Font("SansSerif", Font.BOLD, 12));
        navSlotsBtn.setBackground(new Color(29, 94, 64));
        navSlotsBtn.setForeground(Color.WHITE);
        navSlotsBtn.addActionListener(e -> tabbedPane.setSelectedIndex(2));

        JButton navCaseloadBtn = new JButton("View Student Caseload");
        navCaseloadBtn.setFont(new Font("SansSerif", Font.BOLD, 12));
        navCaseloadBtn.setBackground(new Color(239, 234, 248));
        navCaseloadBtn.addActionListener(e -> tabbedPane.setSelectedIndex(3));

        JButton refreshBtn = new JButton("Refresh Data");
        refreshBtn.setFont(new Font("SansSerif", Font.BOLD, 12));
        refreshBtn.setBackground(Color.WHITE);
        refreshBtn.addActionListener(e -> refreshAllData());

        quickActions.add(navRequestsBtn);
        quickActions.add(navSlotsBtn);
        quickActions.add(navCaseloadBtn);
        quickActions.add(refreshBtn);

        infoCard.add(infoTitle, BorderLayout.NORTH);
        infoCard.add(infoText, BorderLayout.CENTER);
        infoCard.add(quickActions, BorderLayout.SOUTH);

        centerPanel.add(infoCard, BorderLayout.CENTER);
        panel.add(centerPanel, BorderLayout.CENTER);

        return panel;
    }

    // -------------------------------------------------------------
    // TAB 2: BOOKING REQUESTS & APPOINTMENTS (ACCEPT / REJECT)
    // -------------------------------------------------------------
    private JPanel createRequestsTab() {
        JPanel panel = new JPanel(new BorderLayout(10, 10));
        panel.setBackground(Color.WHITE);
        panel.setBorder(BorderFactory.createEmptyBorder(15, 15, 15, 15));

        JPanel header = new JPanel(new BorderLayout());
        header.setBackground(Color.WHITE);

        JLabel label = new JLabel("Student Consultation Requests & Scheduled Sessions");
        label.setFont(new Font("SansSerif", Font.BOLD, 16));
        label.setForeground(new Color(35, 30, 44));

        JButton refreshBtn = new JButton("Refresh List");
        refreshBtn.addActionListener(e -> refreshRequestsTable());
        header.add(label, BorderLayout.WEST);
        header.add(refreshBtn, BorderLayout.EAST);
        panel.add(header, BorderLayout.NORTH);

        String[] cols = {"Appt ID", "Student Name", "Student Email", "Scheduled Time", "Mode", "Workflow Status", "Notes / Reason"};
        requestsModel = new DefaultTableModel(cols, 0) {
            @Override
            public boolean isCellEditable(int row, int col) {
                return false;
            }
        };

        requestsTable = new JTable(requestsModel);
        requestsTable.setRowHeight(28);
        requestsTable.setFont(new Font("SansSerif", Font.PLAIN, 12));
        requestsTable.getTableHeader().setFont(new Font("SansSerif", Font.BOLD, 12));
        requestsTable.getTableHeader().setBackground(new Color(240, 237, 245));
        requestsTable.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);

        panel.add(new JScrollPane(requestsTable), BorderLayout.CENTER);

        // Bottom Actions Panel
        JPanel actionsPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 15, 10));
        actionsPanel.setBackground(new Color(250, 248, 245));
        actionsPanel.setBorder(BorderFactory.createMatteBorder(1, 0, 0, 0, new Color(225, 220, 235)));

        JButton acceptBtn = new JButton("Accept Request");
        acceptBtn.setFont(new Font("SansSerif", Font.BOLD, 13));
        acceptBtn.setBackground(new Color(29, 94, 64)); // Dark green
        acceptBtn.setForeground(Color.WHITE);
        acceptBtn.addActionListener(e -> handleAcceptRequest());

        JButton rejectBtn = new JButton("Reject Request");
        rejectBtn.setFont(new Font("SansSerif", Font.BOLD, 13));
        rejectBtn.setBackground(new Color(220, 38, 38)); // Red
        rejectBtn.setForeground(Color.WHITE);
        rejectBtn.addActionListener(e -> handleRejectRequest());

        JButton completeBtn = new JButton("Mark Completed");
        completeBtn.setFont(new Font("SansSerif", Font.BOLD, 13));
        completeBtn.setBackground(new Color(84, 62, 130)); // Purple
        completeBtn.setForeground(Color.WHITE);
        completeBtn.addActionListener(e -> handleCompleteAppointment());

        actionsPanel.add(new JLabel("Select a row: "));
        actionsPanel.add(acceptBtn);
        actionsPanel.add(rejectBtn);
        actionsPanel.add(completeBtn);

        panel.add(actionsPanel, BorderLayout.SOUTH);

        return panel;
    }

    private void handleAcceptRequest() {
        int selectedRow = requestsTable.getSelectedRow();
        if (selectedRow == -1) {
            JOptionPane.showMessageDialog(this, "Please select an appointment request from the table first.", "Selection Required", JOptionPane.WARNING_MESSAGE);
            return;
        }

        int apptId = (int) requestsModel.getValueAt(selectedRow, 0);
        String status = (String) requestsModel.getValueAt(selectedRow, 5);

        if (!"PENDING".equalsIgnoreCase(status)) {
            JOptionPane.showMessageDialog(this, "Only PENDING booking requests can be accepted. Current status: " + status, "Action Invalid", JOptionPane.INFORMATION_MESSAGE);
            return;
        }

        int confirm = JOptionPane.showConfirmDialog(
            this,
            "Accept student consultation request #" + apptId + "?\nThis will confirm the appointment and send the meeting link to the student.",
            "Confirm Acceptance",
            JOptionPane.YES_NO_OPTION,
            JOptionPane.QUESTION_MESSAGE
        );

        if (confirm == JOptionPane.YES_OPTION) {
            try {
                service.acceptRequest(apptId);
                JOptionPane.showMessageDialog(this, "Appointment #" + apptId + " confirmed successfully!", "Request Accepted", JOptionPane.INFORMATION_MESSAGE);
                refreshAllData();
            } catch (Exception ex) {
                JOptionPane.showMessageDialog(this, "Error accepting request: " + ex.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
            }
        }
    }

    private void handleRejectRequest() {
        int selectedRow = requestsTable.getSelectedRow();
        if (selectedRow == -1) {
            JOptionPane.showMessageDialog(this, "Please select an appointment request from the table first.", "Selection Required", JOptionPane.WARNING_MESSAGE);
            return;
        }

        int apptId = (int) requestsModel.getValueAt(selectedRow, 0);
        String status = (String) requestsModel.getValueAt(selectedRow, 5);

        if (!"PENDING".equalsIgnoreCase(status)) {
            JOptionPane.showMessageDialog(this, "Only PENDING booking requests can be rejected. Current status: " + status, "Action Invalid", JOptionPane.INFORMATION_MESSAGE);
            return;
        }

        String note = JOptionPane.showInputDialog(
            this,
            "Enter reason for rejecting this consultation request (this note will be shared with the student):\nYour availability slot will be automatically reopened for other students.",
            "Schedule Conflict / Unavailable"
        );

        if (note != null) {
            try {
                service.rejectRequest(apptId, note.trim().isEmpty() ? "Counsellor schedule conflict" : note.trim());
                JOptionPane.showMessageDialog(this, "Appointment #" + apptId + " rejected. The availability slot has been reopened.", "Request Rejected", JOptionPane.INFORMATION_MESSAGE);
                refreshAllData();
            } catch (Exception ex) {
                JOptionPane.showMessageDialog(this, "Error rejecting request: " + ex.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
            }
        }
    }

    private void handleCompleteAppointment() {
        int selectedRow = requestsTable.getSelectedRow();
        if (selectedRow == -1) {
            JOptionPane.showMessageDialog(this, "Please select an appointment row first.", "Selection Required", JOptionPane.WARNING_MESSAGE);
            return;
        }

        int apptId = (int) requestsModel.getValueAt(selectedRow, 0);
        String status = (String) requestsModel.getValueAt(selectedRow, 5);

        if ("COMPLETED".equalsIgnoreCase(status)) {
            JOptionPane.showMessageDialog(this, "This appointment is already marked COMPLETED.", "Information", JOptionPane.INFORMATION_MESSAGE);
            return;
        }

        int confirm = JOptionPane.showConfirmDialog(
            this,
            "Mark consultation session #" + apptId + " as COMPLETED?",
            "Mark Completed",
            JOptionPane.YES_NO_OPTION
        );

        if (confirm == JOptionPane.YES_OPTION) {
            try {
                service.completeAppointment(apptId);
                JOptionPane.showMessageDialog(this, "Appointment #" + apptId + " marked as COMPLETED.", "Success", JOptionPane.INFORMATION_MESSAGE);
                refreshAllData();
            } catch (Exception ex) {
                JOptionPane.showMessageDialog(this, "Error completing appointment: " + ex.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
            }
        }
    }

    // -------------------------------------------------------------
    // TAB 3: MANAGE AVAILABILITY SLOTS
    // -------------------------------------------------------------
    private JPanel createSlotsTab() {
        JPanel panel = new JPanel(new BorderLayout(15, 15));
        panel.setBackground(Color.WHITE);
        panel.setBorder(BorderFactory.createEmptyBorder(15, 15, 15, 15));

        // Form to create a new slot
        JPanel formCard = new JPanel(new BorderLayout(10, 10));
        formCard.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createTitledBorder(BorderFactory.createLineBorder(new Color(200, 195, 215)), "Publish New Consultation Window"),
            BorderFactory.createEmptyBorder(10, 15, 10, 15)
        ));
        formCard.setBackground(new Color(250, 248, 245));

        JPanel formGrid = new JPanel(new GridLayout(2, 4, 15, 10));
        formGrid.setBackground(new Color(250, 248, 245));

        // Suggest tomorrow's date
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.DAY_OF_YEAR, 1);
        String tomorrowStr = dayFormat.format(cal.getTime());

        JTextField dateField = new JTextField(tomorrowStr);
        JTextField startTimeField = new JTextField("10:00");
        JTextField endTimeField = new JTextField("11:00");
        JComboBox<String> modeCombo = new JComboBox<>(new String[]{"OFFLINE", "ONLINE"});

        JTextField locationField = new JTextField("Health Center Room 204");
        JTextField meetingUrlField = new JTextField("https://meet.google.com/campus-care");
        meetingUrlField.setEnabled(false);

        modeCombo.addActionListener(e -> {
            boolean isOnline = "ONLINE".equals(modeCombo.getSelectedItem());
            meetingUrlField.setEnabled(isOnline);
            locationField.setEnabled(!isOnline);
        });

        formGrid.add(createLabeledField("Date (YYYY-MM-DD):", dateField));
        formGrid.add(createLabeledField("Start Time (HH:mm):", startTimeField));
        formGrid.add(createLabeledField("End Time (HH:mm):", endTimeField));
        formGrid.add(createLabeledField("Session Mode:", modeCombo));

        formGrid.add(createLabeledField("Room / Physical Location:", locationField));
        formGrid.add(createLabeledField("Meeting Link (Online):", meetingUrlField));

        JPanel publishBtnBox = new JPanel(new FlowLayout(FlowLayout.LEFT, 0, 18));
        publishBtnBox.setBackground(new Color(250, 248, 245));
        JButton publishBtn = new JButton("Publish Availability Slot");
        publishBtn.setFont(new Font("SansSerif", Font.BOLD, 12));
        publishBtn.setBackground(new Color(29, 94, 64));
        publishBtn.setForeground(Color.WHITE);
        publishBtnBox.add(publishBtn);
        formGrid.add(publishBtnBox);

        publishBtn.addActionListener(e -> {
            String dateVal = dateField.getText().trim();
            String startVal = startTimeField.getText().trim();
            String endVal = endTimeField.getText().trim();
            String modeVal = (String) modeCombo.getSelectedItem();
            String locVal = locationField.getText().trim();
            String urlVal = meetingUrlField.getText().trim();

            try {
                Timestamp startTs = Timestamp.valueOf(dateVal + " " + startVal + ":00");
                Timestamp endTs = Timestamp.valueOf(dateVal + " " + endVal + ":00");

                service.createSlot(counsellor.id, startTs, endTs, modeVal, urlVal, locVal, "Regular consultation slot");
                JOptionPane.showMessageDialog(this, "Availability slot published successfully!", "Slot Created", JOptionPane.INFORMATION_MESSAGE);
                refreshAllData();
            } catch (IllegalArgumentException iae) {
                JOptionPane.showMessageDialog(this, "Please enter valid date and time formats (YYYY-MM-DD and HH:mm).", "Validation Error", JOptionPane.ERROR_MESSAGE);
            } catch (Exception ex) {
                JOptionPane.showMessageDialog(this, "Failed to create slot: " + ex.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
            }
        });

        formCard.add(formGrid, BorderLayout.CENTER);
        panel.add(formCard, BorderLayout.NORTH);

        // Slots Table
        String[] cols = {"Slot ID", "Start Time", "End Time", "Available for Booking", "Actions"};
        slotsModel = new DefaultTableModel(cols, 0) {
            @Override
            public boolean isCellEditable(int row, int col) {
                return false;
            }
        };

        slotsTable = new JTable(slotsModel);
        slotsTable.setRowHeight(26);
        slotsTable.setFont(new Font("SansSerif", Font.PLAIN, 12));
        slotsTable.getTableHeader().setFont(new Font("SansSerif", Font.BOLD, 12));
        slotsTable.getTableHeader().setBackground(new Color(240, 237, 245));
        slotsTable.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);

        panel.add(new JScrollPane(slotsTable), BorderLayout.CENTER);

        // Bottom actions for slots
        JPanel bottomBar = new JPanel(new FlowLayout(FlowLayout.RIGHT, 15, 10));
        bottomBar.setBackground(Color.WHITE);

        JButton deleteSlotBtn = new JButton("Close / Remove Selected Slot");
        deleteSlotBtn.setFont(new Font("SansSerif", Font.BOLD, 12));
        deleteSlotBtn.setBackground(new Color(220, 38, 38));
        deleteSlotBtn.setForeground(Color.WHITE);
        deleteSlotBtn.addActionListener(e -> handleDeleteSlot());

        JButton refreshSlotsBtn = new JButton("Refresh Slots");
        refreshSlotsBtn.addActionListener(e -> refreshSlotsTable());

        bottomBar.add(refreshSlotsBtn);
        bottomBar.add(deleteSlotBtn);
        panel.add(bottomBar, BorderLayout.SOUTH);

        return panel;
    }

    private void handleDeleteSlot() {
        int selectedRow = slotsTable.getSelectedRow();
        if (selectedRow == -1) {
            JOptionPane.showMessageDialog(this, "Please select a slot from the table first.", "Selection Required", JOptionPane.WARNING_MESSAGE);
            return;
        }

        int slotId = (int) slotsModel.getValueAt(selectedRow, 0);
        int confirm = JOptionPane.showConfirmDialog(
            this,
            "Are you sure you want to close/remove slot #" + slotId + "?\nIf a student is currently booked in this slot, cancellation is required first.",
            "Confirm Slot Removal",
            JOptionPane.YES_NO_OPTION,
            JOptionPane.WARNING_MESSAGE
        );

        if (confirm == JOptionPane.YES_OPTION) {
            try {
                service.deleteSlot(slotId, counsellor.id);
                JOptionPane.showMessageDialog(this, "Slot #" + slotId + " closed successfully.", "Success", JOptionPane.INFORMATION_MESSAGE);
                refreshAllData();
            } catch (Exception ex) {
                JOptionPane.showMessageDialog(this, "Could not delete slot: " + ex.getMessage(), "Constraint Error", JOptionPane.ERROR_MESSAGE);
            }
        }
    }

    // -------------------------------------------------------------
    // TAB 4: AUTHORIZED STUDENT CASELOAD & CLINICAL RECORDS
    // -------------------------------------------------------------
    private JPanel createCaseloadTab() {
        JPanel panel = new JPanel(new BorderLayout(10, 10));
        panel.setBackground(Color.WHITE);
        panel.setBorder(BorderFactory.createEmptyBorder(15, 15, 15, 15));

        JPanel header = new JPanel(new BorderLayout());
        header.setBackground(Color.WHITE);

        JLabel label = new JLabel("Authorized Student Caseload & Confidential Records");
        label.setFont(new Font("SansSerif", Font.BOLD, 16));
        label.setForeground(new Color(35, 30, 44));

        JLabel privacyNote = new JLabel("Strictly limited to students with active consultation appointments. Protected by role-based clinical privacy.");
        privacyNote.setFont(new Font("SansSerif", Font.ITALIC, 11));
        privacyNote.setForeground(new Color(110, 100, 125));

        JPanel titleStack = new JPanel(new GridLayout(2, 1));
        titleStack.setBackground(Color.WHITE);
        titleStack.add(label);
        titleStack.add(privacyNote);

        JButton refreshBtn = new JButton("Refresh Caseload");
        refreshBtn.addActionListener(e -> refreshCaseloadTable());

        header.add(titleStack, BorderLayout.WEST);
        header.add(refreshBtn, BorderLayout.EAST);
        panel.add(header, BorderLayout.NORTH);

        String[] cols = {"Student ID", "Full Name", "Email Address", "Total Appointments", "Latest Consultation Date"};
        caseloadModel = new DefaultTableModel(cols, 0) {
            @Override
            public boolean isCellEditable(int row, int col) {
                return false;
            }
        };

        caseloadTable = new JTable(caseloadModel);
        caseloadTable.setRowHeight(28);
        caseloadTable.setFont(new Font("SansSerif", Font.PLAIN, 12));
        caseloadTable.getTableHeader().setFont(new Font("SansSerif", Font.BOLD, 12));
        caseloadTable.getTableHeader().setBackground(new Color(240, 237, 245));
        caseloadTable.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);

        panel.add(new JScrollPane(caseloadTable), BorderLayout.CENTER);

        JPanel bottomBar = new JPanel(new FlowLayout(FlowLayout.RIGHT, 15, 10));
        bottomBar.setBackground(Color.WHITE);

        JButton viewScreeningsBtn = new JButton("View Student's Screening History");
        viewScreeningsBtn.setFont(new Font("SansSerif", Font.BOLD, 13));
        viewScreeningsBtn.setBackground(new Color(84, 62, 130));
        viewScreeningsBtn.setForeground(Color.WHITE);
        viewScreeningsBtn.addActionListener(e -> handleViewStudentScreenings());

        bottomBar.add(new JLabel("Select a student to view clinical screening history: "));
        bottomBar.add(viewScreeningsBtn);
        panel.add(bottomBar, BorderLayout.SOUTH);

        return panel;
    }

    private void handleViewStudentScreenings() {
        int selectedRow = caseloadTable.getSelectedRow();
        if (selectedRow == -1) {
            JOptionPane.showMessageDialog(this, "Please select a student from the caseload table first.", "Selection Required", JOptionPane.WARNING_MESSAGE);
            return;
        }

        int studentId = (int) caseloadModel.getValueAt(selectedRow, 0);
        String studentName = (String) caseloadModel.getValueAt(selectedRow, 1);

        try {
            List<Models.Screening> screenings = service.getAuthorizedStudentScreenings(counsellor.id, studentId);
            if (screenings.isEmpty()) {
                JOptionPane.showMessageDialog(
                    this,
                    studentName + " has not yet submitted any clinical wellness screenings.",
                    "No Screenings on File",
                    JOptionPane.INFORMATION_MESSAGE
                );
                return;
            }

            // Create dialog with screenings table
            JDialog dialog = new JDialog((Frame) SwingUtilities.getWindowAncestor(this), "Clinical Wellness History: " + studentName, true);
            dialog.setSize(650, 400);
            dialog.setLocationRelativeTo(this);

            JPanel content = new JPanel(new BorderLayout(10, 10));
            content.setBorder(BorderFactory.createEmptyBorder(15, 15, 15, 15));
            content.setBackground(Color.WHITE);

            JLabel title = new JLabel("Screening Records for " + studentName + " (Student ID #" + studentId + ")");
            title.setFont(new Font("SansSerif", Font.BOLD, 15));
            title.setForeground(new Color(35, 30, 44));
            content.add(title, BorderLayout.NORTH);

            String[] sCols = {"Screening ID", "Overall Score", "Clinical Summary", "Date Submitted"};
            DefaultTableModel sModel = new DefaultTableModel(sCols, 0);
            for (Models.Screening s : screenings) {
                sModel.addRow(new Object[]{
                    s.screeningId,
                    String.format("%.1f", s.overallScore),
                    s.summary,
                    s.submittedAt != null ? dateFormat.format(s.submittedAt) : "N/A"
                });
            }

            JTable sTable = new JTable(sModel);
            sTable.setRowHeight(26);
            sTable.setFont(new Font("SansSerif", Font.PLAIN, 12));
            content.add(new JScrollPane(sTable), BorderLayout.CENTER);

            JButton closeBtn = new JButton("Close");
            closeBtn.addActionListener(e -> dialog.dispose());
            JPanel btnBox = new JPanel(new FlowLayout(FlowLayout.RIGHT));
            btnBox.setBackground(Color.WHITE);
            btnBox.add(closeBtn);
            content.add(btnBox, BorderLayout.SOUTH);

            dialog.setContentPane(content);
            dialog.setVisible(true);

        } catch (Exception ex) {
            JOptionPane.showMessageDialog(this, "Privacy Access Error: " + ex.getMessage(), "Access Denied", JOptionPane.ERROR_MESSAGE);
        }
    }

    // -------------------------------------------------------------
    // TAB 5: CLINICAL REPORTS & INSTITUTIONAL ANALYTICS
    // -------------------------------------------------------------
    private JPanel createAnalyticsTab() {
        JPanel panel = new JPanel(new BorderLayout(15, 15));
        panel.setBackground(Color.WHITE);
        panel.setBorder(BorderFactory.createEmptyBorder(20, 20, 20, 20));

        JPanel header = new JPanel(new BorderLayout());
        header.setBackground(Color.WHITE);
        JLabel title = new JLabel("Institutional Wellness Screening & Clinical Analytics");
        title.setFont(new Font("SansSerif", Font.BOLD, 16));
        title.setForeground(new Color(35, 30, 44));

        JButton refreshBtn = new JButton("Refresh Analytics");
        refreshBtn.addActionListener(e -> refreshAnalytics());
        header.add(title, BorderLayout.WEST);
        header.add(refreshBtn, BorderLayout.EAST);
        panel.add(header, BorderLayout.NORTH);

        JPanel centerPanel = new JPanel(new GridLayout(2, 1, 15, 15));
        centerPanel.setBackground(Color.WHITE);

        // Top Row: Institution stats
        JPanel instGrid = new JPanel(new GridLayout(1, 3, 15, 15));
        instGrid.setBackground(Color.WHITE);

        campusTotalStudentsLabel = new JLabel("0", SwingConstants.CENTER);
        campusTotalStudentsLabel.setFont(new Font("SansSerif", Font.BOLD, 28));
        campusTotalStudentsLabel.setForeground(new Color(30, 64, 175));

        campusTotalScreeningsLabel = new JLabel("0", SwingConstants.CENTER);
        campusTotalScreeningsLabel.setFont(new Font("SansSerif", Font.BOLD, 28));
        campusTotalScreeningsLabel.setForeground(new Color(84, 62, 130));

        campusAvgScoreLabel = new JLabel("0.0", SwingConstants.CENTER);
        campusAvgScoreLabel.setFont(new Font("SansSerif", Font.BOLD, 28));
        campusAvgScoreLabel.setForeground(new Color(29, 94, 64));

        instGrid.add(createMetricCard("Total Enrolled Students", campusTotalStudentsLabel, new Color(219, 234, 254)));
        instGrid.add(createMetricCard("Screenings Administered", campusTotalScreeningsLabel, new Color(239, 234, 248)));
        instGrid.add(createMetricCard("Campus Average Distress Score", campusAvgScoreLabel, new Color(224, 244, 234)));

        // Bottom Row: Risk Distribution
        JPanel riskCard = new JPanel(new BorderLayout(10, 10));
        riskCard.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createTitledBorder(BorderFactory.createLineBorder(new Color(200, 195, 215)), "Campus Mental Health Distress Distribution (PHQ/GAD Scale)"),
            BorderFactory.createEmptyBorder(15, 15, 15, 15)
        ));
        riskCard.setBackground(new Color(250, 248, 245));

        JPanel riskGrid = new JPanel(new GridLayout(1, 3, 15, 15));
        riskGrid.setBackground(new Color(250, 248, 245));

        lowRiskLabel = new JLabel("0 (0%)", SwingConstants.CENTER);
        lowRiskLabel.setFont(new Font("SansSerif", Font.BOLD, 24));
        lowRiskLabel.setForeground(new Color(29, 94, 64));

        modRiskLabel = new JLabel("0 (0%)", SwingConstants.CENTER);
        modRiskLabel.setFont(new Font("SansSerif", Font.BOLD, 24));
        modRiskLabel.setForeground(new Color(180, 83, 9));

        highRiskLabel = new JLabel("0 (0%)", SwingConstants.CENTER);
        highRiskLabel.setFont(new Font("SansSerif", Font.BOLD, 24));
        highRiskLabel.setForeground(new Color(220, 38, 38));

        riskGrid.add(createMetricCard("Mild Distress (0 - 4)", lowRiskLabel, new Color(224, 244, 234)));
        riskGrid.add(createMetricCard("Moderate Distress (5 - 10)", modRiskLabel, new Color(254, 243, 199)));
        riskGrid.add(createMetricCard("High / Severe Distress (11+)", highRiskLabel, new Color(254, 226, 226)));

        riskCard.add(riskGrid, BorderLayout.CENTER);

        centerPanel.add(instGrid);
        centerPanel.add(riskCard);
        panel.add(centerPanel, BorderLayout.CENTER);

        return panel;
    }

    // -------------------------------------------------------------
    // DATA REFRESH LOGIC
    // -------------------------------------------------------------
    public void refreshAllData() {
        refreshRequestsTable();
        refreshSlotsTable();
        refreshCaseloadTable();
        refreshAnalytics();
    }

    private void refreshRequestsTable() {
        try {
            List<Models.Appointment> list = service.getCounsellorAppointments(counsellor.id);
            requestsModel.setRowCount(0);
            int pendingCount = 0;
            int confirmedCount = 0;
            int completedCount = 0;

            for (Models.Appointment a : list) {
                if ("PENDING".equalsIgnoreCase(a.workflowStatus)) pendingCount++;
                else if ("CONFIRMED".equalsIgnoreCase(a.workflowStatus)) confirmedCount++;
                else if ("COMPLETED".equalsIgnoreCase(a.workflowStatus)) completedCount++;

                String timeStr = (a.slotStart != null ? dateFormat.format(a.slotStart) : "N/A") +
                                 " - " + (a.slotEnd != null ? new SimpleDateFormat("HH:mm").format(a.slotEnd) : "N/A");

                requestsModel.addRow(new Object[]{
                    a.appointmentId,
                    a.studentName != null ? a.studentName : "Student #" + a.studentId,
                    a.studentEmail != null ? a.studentEmail : "N/A",
                    timeStr,
                    a.sessionMode != null ? a.sessionMode : "OFFLINE",
                    a.workflowStatus,
                    a.reason != null ? a.reason : "Consultation"
                });
            }

            pendingRequestsLabel.setText(String.valueOf(pendingCount));
            confirmedSessionsLabel.setText(String.valueOf(confirmedCount));
            completedSessionsLabel.setText(String.valueOf(completedCount));
        } catch (Exception ex) {
            System.err.println("Error loading counsellor appointments: " + ex.getMessage());
        }
    }

    private void refreshSlotsTable() {
        try {
            List<Models.AvailabilitySlot> list = service.getCounsellorAvailabilitySlots(counsellor.id);
            slotsModel.setRowCount(0);
            int activeCount = 0;

            for (Models.AvailabilitySlot s : list) {
                if (s.isAvailable && s.slotStart.after(new Timestamp(System.currentTimeMillis()))) {
                    activeCount++;
                }

                String status = s.isAvailable ? (s.slotStart.after(new Timestamp(System.currentTimeMillis())) ? "OPEN / AVAILABLE" : "EXPIRED") : "BOOKED / CLOSED";
                String action = s.isAvailable ? "Active" : "Closed";

                slotsModel.addRow(new Object[]{
                    s.availabilityId,
                    s.slotStart != null ? dateFormat.format(s.slotStart) : "N/A",
                    s.slotEnd != null ? dateFormat.format(s.slotEnd) : "N/A",
                    status,
                    action
                });
            }
            activeSlotsLabel.setText(String.valueOf(activeCount));
        } catch (Exception ex) {
            System.err.println("Error loading counsellor slots: " + ex.getMessage());
        }
    }

    private void refreshCaseloadTable() {
        try {
            List<Models.AuthorizedStudent> list = service.getAuthorizedStudents(counsellor.id);
            caseloadModel.setRowCount(0);
            for (Models.AuthorizedStudent st : list) {
                caseloadModel.addRow(new Object[]{
                    st.studentId,
                    st.fullName,
                    st.email,
                    st.totalSessions,
                    st.latestSessionDate != null ? dateFormat.format(st.latestSessionDate) : "N/A"
                });
            }
        } catch (Exception ex) {
            System.err.println("Error loading caseload: " + ex.getMessage());
        }
    }

    private void refreshAnalytics() {
        try {
            Models.ClinicalAnalytics stats = service.getCounsellorAnalytics(counsellor.id);
            campusTotalStudentsLabel.setText(String.valueOf(stats.totalStudents));
            campusTotalScreeningsLabel.setText(String.valueOf(stats.totalScreenings));
            campusAvgScoreLabel.setText(String.format("%.2f / 27.0", stats.averageScore));

            int total = stats.totalScreenings > 0 ? stats.totalScreenings : 1;
            int lowPct = (int) Math.round((stats.lowDistressCount * 100.0) / total);
            int modPct = (int) Math.round((stats.moderateDistressCount * 100.0) / total);
            int highPct = (int) Math.round((stats.highDistressCount * 100.0) / total);

            lowRiskLabel.setText(stats.lowDistressCount + " (" + lowPct + "%)");
            modRiskLabel.setText(stats.moderateDistressCount + " (" + modPct + "%)");
            highRiskLabel.setText(stats.highDistressCount + " (" + highPct + "%)");
        } catch (Exception ex) {
            System.err.println("Error loading analytics: " + ex.getMessage());
        }
    }

    private JPanel createMetricCard(String title, JLabel valueLabel, Color bg) {
        JPanel card = new JPanel(new BorderLayout(5, 5));
        card.setBackground(bg);
        card.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(new Color(220, 220, 225)),
            BorderFactory.createEmptyBorder(15, 15, 15, 15)
        ));

        JLabel titleLbl = new JLabel(title, SwingConstants.CENTER);
        titleLbl.setFont(new Font("SansSerif", Font.BOLD, 12));
        titleLbl.setForeground(new Color(83, 75, 98));

        card.add(titleLbl, BorderLayout.NORTH);
        card.add(valueLabel, BorderLayout.CENTER);
        return card;
    }

    private JPanel createLabeledField(String labelText, JComponent field) {
        JPanel p = new JPanel(new BorderLayout(3, 3));
        p.setBackground(new Color(250, 248, 245));
        JLabel lbl = new JLabel(labelText);
        lbl.setFont(new Font("SansSerif", Font.BOLD, 11));
        lbl.setForeground(new Color(83, 75, 98));
        p.add(lbl, BorderLayout.NORTH);
        p.add(field, BorderLayout.CENTER);
        return p;
    }
}
