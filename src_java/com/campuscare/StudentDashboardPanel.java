package com.campuscare;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.text.SimpleDateFormat;
import java.util.List;

public class StudentDashboardPanel extends JPanel {
    private final Models.User student;
    private final AppointmentService service;
    private final MainApp mainApp;
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm");

    // Tables
    private JTable appointmentsTable;
    private DefaultTableModel appointmentsModel;
    private JTable availableSlotsTable;
    private DefaultTableModel availableSlotsModel;
    private JTable screeningsTable;
    private DefaultTableModel screeningsModel;

    // Overview Labels
    private JLabel totalScreeningsLabel;
    private JLabel upcomingApptsLabel;
    private JLabel latestScoreLabel;

    public StudentDashboardPanel(Models.User student, MainApp mainApp) {
        this.student = student;
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
        JLabel titleLabel = new JLabel("Welcome, " + student.fullName + " (Student ID #" + student.id + ")");
        titleLabel.setFont(new Font("SansSerif", Font.BOLD, 18));
        titleLabel.setForeground(new Color(35, 30, 44));

        JLabel subLabel = new JLabel("Confidential Campus Wellness & Counselling Portal · " + student.email);
        subLabel.setFont(new Font("SansSerif", Font.PLAIN, 12));
        subLabel.setForeground(new Color(83, 75, 98));

        titleBox.add(titleLabel);
        titleBox.add(subLabel);

        JButton logoutBtn = new JButton("Sign Out");
        logoutBtn.setBackground(new Color(239, 234, 248));
        logoutBtn.addActionListener(e -> mainApp.showLoginScreen());

        headerPanel.add(titleBox, BorderLayout.WEST);
        headerPanel.add(logoutBtn, BorderLayout.EAST);
        add(headerPanel, BorderLayout.NORTH);

        // Tabbed Pane
        JTabbedPane tabbedPane = new JTabbedPane();
        tabbedPane.setFont(new Font("SansSerif", Font.BOLD, 13));

        tabbedPane.addTab("Dashboard Overview", createOverviewTab());
        tabbedPane.addTab("My Appointments", createAppointmentsTab());
        tabbedPane.addTab("Book Counselling Slot", createBookingTab());
        tabbedPane.addTab("Wellness History", createHistoryTab());
        tabbedPane.addTab("Take Wellness Screening", createScreeningQuizTab());

        add(tabbedPane, BorderLayout.CENTER);

        // Load data
        refreshAllData();
    }

    private JPanel createOverviewTab() {
        JPanel panel = new JPanel(new BorderLayout(15, 15));
        panel.setBackground(Color.WHITE);
        panel.setBorder(BorderFactory.createEmptyBorder(20, 20, 20, 20));

        // Metric Cards Grid
        JPanel cardsGrid = new JPanel(new GridLayout(1, 3, 15, 15));
        cardsGrid.setBackground(Color.WHITE);

        totalScreeningsLabel = new JLabel("0", SwingConstants.CENTER);
        totalScreeningsLabel.setFont(new Font("SansSerif", Font.BOLD, 28));
        totalScreeningsLabel.setForeground(new Color(84, 62, 130));

        upcomingApptsLabel = new JLabel("0", SwingConstants.CENTER);
        upcomingApptsLabel.setFont(new Font("SansSerif", Font.BOLD, 28));
        upcomingApptsLabel.setForeground(new Color(29, 94, 64));

        latestScoreLabel = new JLabel("--", SwingConstants.CENTER);
        latestScoreLabel.setFont(new Font("SansSerif", Font.BOLD, 28));
        latestScoreLabel.setForeground(new Color(35, 30, 44));

        cardsGrid.add(createMetricCard("Total Screenings Completed", totalScreeningsLabel, new Color(239, 234, 248)));
        cardsGrid.add(createMetricCard("Active Appointments", upcomingApptsLabel, new Color(224, 244, 234)));
        cardsGrid.add(createMetricCard("Latest Wellness Score", latestScoreLabel, new Color(250, 246, 240)));

        panel.add(cardsGrid, BorderLayout.NORTH);

        // Welcome Info Area
        JTextArea infoText = new JTextArea();
        infoText.setEditable(false);
        infoText.setLineWrap(true);
        infoText.setWrapStyleWord(true);
        infoText.setFont(new Font("SansSerif", Font.PLAIN, 13));
        infoText.setForeground(new Color(83, 75, 98));
        infoText.setText(
            "About CampusCare:\n" +
            "------------------\n" +
            "• Confidentiality: Your mental wellness check-ins are strictly confidential and protected by role-based clinical privacy.\n" +
            "• Booking Workflow: When you request an appointment slot, it is placed in 'PENDING' review. Once your counsellor accepts, the status updates to 'CONFIRMED' and your video conferencing link or room location will be revealed.\n" +
            "• Emergency Support: If you are experiencing immediate distress, please call the 24/7 Campus Crisis line at 1-800-273-TALK or Campus Security."
        );
        panel.add(new JScrollPane(infoText), BorderLayout.CENTER);

        return panel;
    }

    private JPanel createMetricCard(String title, JLabel valueLabel, Color bg) {
        JPanel card = new JPanel(new BorderLayout(5, 5));
        card.setBackground(bg);
        card.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(new Color(43, 36, 56), 1),
            BorderFactory.createEmptyBorder(15, 15, 15, 15)
        ));

        JLabel titleLbl = new JLabel(title, SwingConstants.CENTER);
        titleLbl.setFont(new Font("SansSerif", Font.BOLD, 12));
        titleLbl.setForeground(new Color(83, 75, 98));

        card.add(titleLbl, BorderLayout.NORTH);
        card.add(valueLabel, BorderLayout.CENTER);
        return card;
    }

    private JPanel createAppointmentsTab() {
        JPanel panel = new JPanel(new BorderLayout(10, 10));
        panel.setBackground(Color.WHITE);
        panel.setBorder(BorderFactory.createEmptyBorder(15, 15, 15, 15));

        String[] cols = {"ID", "Counsellor", "Start Time", "End Time", "Workflow Status", "Mode", "Meeting Link / Location", "Reason"};
        appointmentsModel = new DefaultTableModel(cols, 0) {
            @Override public boolean isCellEditable(int r, int c) { return false; }
        };
        appointmentsTable = new JTable(appointmentsModel);
        appointmentsTable.setRowHeight(26);
        appointmentsTable.setFont(new Font("SansSerif", Font.PLAIN, 12));

        panel.add(new JScrollPane(appointmentsTable), BorderLayout.CENTER);

        JPanel bottomBar = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        bottomBar.setBackground(Color.WHITE);

        JButton cancelBtn = new JButton("Cancel Selected Appointment");
        cancelBtn.setBackground(new Color(253, 232, 232));
        cancelBtn.setForeground(new Color(155, 28, 28));
        cancelBtn.addActionListener(e -> cancelSelectedAppointment());

        JButton refreshBtn = new JButton("Refresh Appointments");
        refreshBtn.addActionListener(e -> refreshAppointments());

        bottomBar.add(refreshBtn);
        bottomBar.add(cancelBtn);
        panel.add(bottomBar, BorderLayout.SOUTH);

        return panel;
    }

    private JPanel createBookingTab() {
        JPanel panel = new JPanel(new BorderLayout(10, 10));
        panel.setBackground(Color.WHITE);
        panel.setBorder(BorderFactory.createEmptyBorder(15, 15, 15, 15));

        JLabel instrLabel = new JLabel("Available Counsellor Slots (Select a slot and click 'Request Booking'):");
        instrLabel.setFont(new Font("SansSerif", Font.BOLD, 13));
        panel.add(instrLabel, BorderLayout.NORTH);

        String[] cols = {"Slot ID", "Counsellor", "Specialization", "Start Time", "End Time"};
        availableSlotsModel = new DefaultTableModel(cols, 0) {
            @Override public boolean isCellEditable(int r, int c) { return false; }
        };
        availableSlotsTable = new JTable(availableSlotsModel);
        availableSlotsTable.setRowHeight(26);
        availableSlotsTable.setFont(new Font("SansSerif", Font.PLAIN, 12));

        panel.add(new JScrollPane(availableSlotsTable), BorderLayout.CENTER);

        JPanel bottomBar = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        bottomBar.setBackground(Color.WHITE);

        JButton bookBtn = new JButton("Request Selected Booking Slot");
        bookBtn.setBackground(new Color(224, 244, 234));
        bookBtn.setForeground(new Color(29, 94, 64));
        bookBtn.setFont(new Font("SansSerif", Font.BOLD, 13));
        bookBtn.addActionListener(e -> bookSelectedSlot());

        JButton refreshBtn = new JButton("Refresh Open Slots");
        refreshBtn.addActionListener(e -> refreshAvailableSlots());

        bottomBar.add(refreshBtn);
        bottomBar.add(bookBtn);
        panel.add(bottomBar, BorderLayout.SOUTH);

        return panel;
    }

    private JPanel createHistoryTab() {
        JPanel panel = new JPanel(new BorderLayout(10, 10));
        panel.setBackground(Color.WHITE);
        panel.setBorder(BorderFactory.createEmptyBorder(15, 15, 15, 15));

        String[] cols = {"Assessment ID", "Date Submitted", "Distress Score (0-30)", "Clinical Screening Summary"};
        screeningsModel = new DefaultTableModel(cols, 0) {
            @Override public boolean isCellEditable(int r, int c) { return false; }
        };
        screeningsTable = new JTable(screeningsModel);
        screeningsTable.setRowHeight(26);
        screeningsTable.setFont(new Font("SansSerif", Font.PLAIN, 12));

        panel.add(new JScrollPane(screeningsTable), BorderLayout.CENTER);

        JPanel bottomBar = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        bottomBar.setBackground(Color.WHITE);
        JButton refreshBtn = new JButton("Refresh History");
        refreshBtn.addActionListener(e -> refreshScreenings());
        bottomBar.add(refreshBtn);
        panel.add(bottomBar, BorderLayout.SOUTH);

        return panel;
    }

    private JPanel createScreeningQuizTab() {
        JPanel panel = new JPanel(new BorderLayout(15, 15));
        panel.setBackground(Color.WHITE);
        panel.setBorder(BorderFactory.createEmptyBorder(20, 20, 20, 20));

        JLabel title = new JLabel("Standard Student Wellness Self-Screening Assessment");
        title.setFont(new Font("SansSerif", Font.BOLD, 16));
        panel.add(title, BorderLayout.NORTH);

        JPanel questionsBox = new JPanel(new GridLayout(6, 1, 10, 10));
        questionsBox.setBackground(Color.WHITE);

        String[] questions = {
            "1. How often have you felt overwhelmed by academic deadlines over the past two weeks?",
            "2. How frequently have you experienced restless sleep or insomnia?",
            "3. Have you felt a loss of interest or pleasure in social/campus activities?",
            "4. How often have you experienced physical fatigue or low energy during lectures?",
            "5. Have you felt persistent worry, nervous tension, or anxiety?"
        };

        JComboBox<String>[] dropdowns = new JComboBox[5];
        String[] options = {"0 - Not at all (0 pts)", "1 - Several days (1 pt)", "2 - More than half the days (2 pts)", "3 - Nearly every day (3 pts)"};

        for (int i = 0; i < 5; i++) {
            JPanel qPanel = new JPanel(new BorderLayout(5, 5));
            qPanel.setBackground(Color.WHITE);
            JLabel qLabel = new JLabel(questions[i]);
            qLabel.setFont(new Font("SansSerif", Font.PLAIN, 13));
            dropdowns[i] = new JComboBox<>(options);
            qPanel.add(qLabel, BorderLayout.NORTH);
            qPanel.add(dropdowns[i], BorderLayout.CENTER);
            questionsBox.add(qPanel);
        }

        panel.add(new JScrollPane(questionsBox), BorderLayout.CENTER);

        JButton submitBtn = new JButton("Submit Wellness Screening");
        submitBtn.setBackground(new Color(239, 234, 248));
        submitBtn.setFont(new Font("SansSerif", Font.BOLD, 14));
        submitBtn.addActionListener(e -> {
            int score = 0;
            for (JComboBox<String> cb : dropdowns) {
                score += cb.getSelectedIndex() * 2; // Scaled to 30 max
            }
            String category = score <= 9 ? "Mild Range - General Wellness Maintenance" :
                              score <= 19 ? "Moderate Range - Coping & Stress Reduction Advised" :
                                            "Elevated Range - Priority Counselling Recommended";
            try {
                service.submitScreening(student.id, score, category);
                JOptionPane.showMessageDialog(this, 
                    "Screening assessment recorded successfully!\nScore: " + score + " / 30.0\nCategory: " + category, 
                    "Screening Complete", 
                    JOptionPane.INFORMATION_MESSAGE);
                refreshAllData();
            } catch (Exception ex) {
                JOptionPane.showMessageDialog(this, "Failed to submit screening: " + ex.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
            }
        });

        panel.add(submitBtn, BorderLayout.SOUTH);
        return panel;
    }

    private void bookSelectedSlot() {
        int row = availableSlotsTable.getSelectedRow();
        if (row == -1) {
            JOptionPane.showMessageDialog(this, "Please select an available slot from the table first.", "Selection Required", JOptionPane.WARNING_MESSAGE);
            return;
        }

        int slotId = (int) availableSlotsModel.getValueAt(row, 0);
        String counsellor = (String) availableSlotsModel.getValueAt(row, 1);
        String reason = JOptionPane.showInputDialog(this, "Reason or note for " + counsellor + " (e.g. Exam stress, personal advice):");
        if (reason == null) return; // User cancelled

        try {
            int apptId = service.bookAppointment(student.id, slotId, reason, "OFFLINE", null, "Wellness Room 204");
            JOptionPane.showMessageDialog(this, 
                "Booking request #" + apptId + " submitted successfully!\nStatus: PENDING counsellor confirmation.",
                "Request Submitted", 
                JOptionPane.INFORMATION_MESSAGE);
            refreshAllData();
        } catch (Exception e) {
            JOptionPane.showMessageDialog(this, "Booking failed: " + e.getMessage(), "Booking Error", JOptionPane.ERROR_MESSAGE);
        }
    }

    private void cancelSelectedAppointment() {
        int row = appointmentsTable.getSelectedRow();
        if (row == -1) {
            JOptionPane.showMessageDialog(this, "Please select an appointment to cancel.", "Selection Required", JOptionPane.WARNING_MESSAGE);
            return;
        }

        int apptId = (int) appointmentsModel.getValueAt(row, 0);
        int confirm = JOptionPane.showConfirmDialog(this, "Cancel appointment #" + apptId + "? The slot will be reopened.", "Confirm Cancellation", JOptionPane.YES_NO_OPTION);
        if (confirm != JOptionPane.YES_OPTION) return;

        try {
            service.cancelAppointment(apptId);
            JOptionPane.showMessageDialog(this, "Appointment cancelled successfully.", "Cancelled", JOptionPane.INFORMATION_MESSAGE);
            refreshAllData();
        } catch (Exception e) {
            JOptionPane.showMessageDialog(this, "Failed to cancel: " + e.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
        }
    }

    private void refreshAllData() {
        refreshAppointments();
        refreshAvailableSlots();
        refreshScreenings();
    }

    private void refreshAppointments() {
        try {
            List<Models.Appointment> list = service.getStudentAppointments(student.id);
            appointmentsModel.setRowCount(0);
            int active = 0;
            for (Models.Appointment a : list) {
                if ("BOOKED".equalsIgnoreCase(a.bookingStatus)) active++;
                String locationOrLink = a.meetingLink != null ? a.meetingLink : a.location;
                appointmentsModel.addRow(new Object[]{
                    a.appointmentId,
                    a.counsellorName,
                    a.slotStart != null ? dateFormat.format(a.slotStart) : "",
                    a.slotEnd != null ? dateFormat.format(a.slotEnd) : "",
                    a.workflowStatus,
                    a.sessionMode,
                    locationOrLink,
                    a.reason
                });
            }
            upcomingApptsLabel.setText(String.valueOf(active));
        } catch (Exception e) {
            System.err.println("Error loading appointments: " + e.getMessage());
        }
    }

    private void refreshAvailableSlots() {
        try {
            List<Models.AvailabilitySlot> list = service.getAvailableSlots();
            availableSlotsModel.setRowCount(0);
            for (Models.AvailabilitySlot s : list) {
                availableSlotsModel.addRow(new Object[]{
                    s.availabilityId,
                    s.counsellorName,
                    s.specialization,
                    s.slotStart != null ? dateFormat.format(s.slotStart) : "",
                    s.slotEnd != null ? dateFormat.format(s.slotEnd) : ""
                });
            }
        } catch (Exception e) {
            System.err.println("Error loading slots: " + e.getMessage());
        }
    }

    private void refreshScreenings() {
        try {
            List<Models.Screening> list = service.getStudentScreenings(student.id);
            screeningsModel.setRowCount(0);
            totalScreeningsLabel.setText(String.valueOf(list.size()));
            if (!list.isEmpty()) {
                latestScoreLabel.setText(String.format("%.1f", list.get(0).overallScore));
            } else {
                latestScoreLabel.setText("--");
            }
            for (Models.Screening s : list) {
                screeningsModel.addRow(new Object[]{
                    s.screeningId,
                    s.submittedAt != null ? dateFormat.format(s.submittedAt) : "",
                    String.format("%.1f", s.overallScore),
                    s.summary
                });
            }
        } catch (Exception e) {
            System.err.println("Error loading screenings: " + e.getMessage());
        }
    }
}
