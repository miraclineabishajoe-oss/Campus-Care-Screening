package com.campuscare;

import com.formdev.flatlaf.FlatLightLaf;

import javax.swing.*;
import java.awt.*;

public class MainApp extends JFrame {
    private final CardLayout cardLayout;
    private final JPanel cardsPanel;
    private final AuthService authService;

    // Login Form Fields
    private JTextField studentEmailField;
    private JPasswordField studentPasswordField;
    private JTextField counsellorEmailField;
    private JPasswordField counsellorPasswordField;

    // Register Form Fields
    private JTextField studentRegNameField;
    private JTextField studentRegEmailField;
    private JPasswordField studentRegPasswordField;

    private JTextField counsellorRegNameField;
    private JTextField counsellorRegEmailField;
    private JTextField counsellorRegSpecField;
    private JPasswordField counsellorRegPasswordField;

    public MainApp() {
        super("CampusCare — Student Wellness Screening & Counselling Coordination System");
        this.authService = new AuthService();
        this.cardLayout = new CardLayout();
        this.cardsPanel = new JPanel(cardLayout);

        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(1120, 760);
        setMinimumSize(new Dimension(950, 650));
        setLocationRelativeTo(null);

        // Add Login Card
        cardsPanel.add(createLoginCard(), "LOGIN");

        add(cardsPanel, BorderLayout.CENTER);
        showLoginScreen();
    }

    public void showLoginScreen() {
        cardLayout.show(cardsPanel, "LOGIN");
    }

    public void showStudentDashboard(Models.User student) {
        StudentDashboardPanel studentPanel = new StudentDashboardPanel(student, this);
        cardsPanel.add(studentPanel, "STUDENT_DASHBOARD");
        cardLayout.show(cardsPanel, "STUDENT_DASHBOARD");
    }

    public void showCounsellorDashboard(Models.User counsellor) {
        CounsellorDashboardPanel counsellorPanel = new CounsellorDashboardPanel(counsellor, this);
        cardsPanel.add(counsellorPanel, "COUNSELLOR_DASHBOARD");
        cardLayout.show(cardsPanel, "COUNSELLOR_DASHBOARD");
    }

    private JPanel createLoginCard() {
        JPanel mainPanel = new JPanel(new BorderLayout());
        mainPanel.setBackground(new Color(250, 248, 245));

        // Top Banner
        JPanel bannerPanel = new JPanel(new BorderLayout());
        bannerPanel.setBackground(new Color(250, 248, 245));
        bannerPanel.setBorder(BorderFactory.createEmptyBorder(25, 30, 20, 30));

        JPanel brandPanel = new JPanel(new GridLayout(2, 1));
        brandPanel.setBackground(new Color(250, 248, 245));

        JLabel brandTitle = new JLabel("CampusCare");
        brandTitle.setFont(new Font("SansSerif", Font.BOLD, 26));
        brandTitle.setForeground(new Color(35, 30, 44));

        JLabel brandSub = new JLabel("Student Wellness Screening & Counselling Coordination System · Java Swing & MySQL 8.0 Edition");
        brandSub.setFont(new Font("SansSerif", Font.PLAIN, 13));
        brandSub.setForeground(new Color(83, 75, 98));

        brandPanel.add(brandTitle);
        brandPanel.add(brandSub);

        // Live Database Status Badge
        JPanel dbBadge = new JPanel(new FlowLayout(FlowLayout.RIGHT, 10, 5));
        dbBadge.setBackground(new Color(250, 248, 245));
        JLabel dbStatus = new JLabel("● MySQL 8.0 Live Connected · localhost:3306");
        dbStatus.setFont(new Font("SansSerif", Font.BOLD, 12));
        dbStatus.setForeground(new Color(29, 94, 64)); // Dark Green
        dbBadge.add(dbStatus);

        bannerPanel.add(brandPanel, BorderLayout.WEST);
        bannerPanel.add(dbBadge, BorderLayout.EAST);
        mainPanel.add(bannerPanel, BorderLayout.NORTH);

        // Center Login / Registration Box
        JPanel centerWrapper = new JPanel(new GridBagLayout());
        centerWrapper.setBackground(new Color(250, 248, 245));

        JPanel cardBox = new JPanel(new BorderLayout());
        cardBox.setPreferredSize(new Dimension(600, 520));
        cardBox.setBackground(Color.WHITE);
        cardBox.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(new Color(220, 215, 230), 2),
            BorderFactory.createEmptyBorder(15, 20, 20, 20)
        ));

        JTabbedPane tabbedPane = new JTabbedPane();
        tabbedPane.setFont(new Font("SansSerif", Font.BOLD, 13));

        tabbedPane.addTab("Student Sign In", createStudentLoginPanel());
        tabbedPane.addTab("Counsellor Sign In", createCounsellorLoginPanel());
        tabbedPane.addTab("New Student Register", createStudentRegisterPanel());
        tabbedPane.addTab("New Counsellor Register", createCounsellorRegisterPanel());

        cardBox.add(tabbedPane, BorderLayout.CENTER);
        centerWrapper.add(cardBox);

        mainPanel.add(centerWrapper, BorderLayout.CENTER);

        // Bottom Footer
        JPanel footer = new JPanel(new FlowLayout(FlowLayout.CENTER));
        footer.setBackground(new Color(250, 248, 245));
        footer.setBorder(BorderFactory.createEmptyBorder(10, 10, 15, 10));
        JLabel footerLabel = new JLabel("CampusCare Desktop System · Complete DBMS Project Architecture · Strictly Role-Based Security");
        footerLabel.setFont(new Font("SansSerif", Font.PLAIN, 11));
        footerLabel.setForeground(new Color(110, 100, 125));
        footer.add(footerLabel);
        mainPanel.add(footer, BorderLayout.SOUTH);

        return mainPanel;
    }

    // -------------------------------------------------------------
    // STUDENT LOGIN
    // -------------------------------------------------------------
    private JPanel createStudentLoginPanel() {
        JPanel panel = new JPanel(new BorderLayout(10, 15));
        panel.setBackground(Color.WHITE);
        panel.setBorder(BorderFactory.createEmptyBorder(20, 25, 15, 25));

        JPanel formGrid = new JPanel(new GridLayout(4, 1, 8, 8));
        formGrid.setBackground(Color.WHITE);

        studentEmailField = new JTextField("alex.rivera@student.campuscare.edu");
        studentPasswordField = new JPasswordField("Password123!");

        formGrid.add(createLabeledField("Student Email Address:", studentEmailField));
        formGrid.add(createLabeledField("Password:", studentPasswordField));

        JButton loginBtn = new JButton("Sign In as Student");
        loginBtn.setFont(new Font("SansSerif", Font.BOLD, 14));
        loginBtn.setBackground(new Color(84, 62, 130)); // Deep Purple
        loginBtn.setForeground(Color.WHITE);
        loginBtn.setPreferredSize(new Dimension(200, 38));

        loginBtn.addActionListener(e -> handleStudentLogin());

        JPanel btnBox = new JPanel(new FlowLayout(FlowLayout.CENTER));
        btnBox.setBackground(Color.WHITE);
        btnBox.add(loginBtn);
        formGrid.add(btnBox);

        panel.add(formGrid, BorderLayout.CENTER);

        // Demo Quick Fill Bar
        JPanel demoBar = new JPanel(new FlowLayout(FlowLayout.CENTER, 5, 5));
        demoBar.setBackground(new Color(248, 246, 252));
        demoBar.setBorder(BorderFactory.createLineBorder(new Color(230, 225, 240)));

        JButton demoBtn = new JButton("Use Demo Student (Alex Rivera)");
        demoBtn.setFont(new Font("SansSerif", Font.PLAIN, 11));
        demoBtn.addActionListener(e -> {
            studentEmailField.setText("alex.rivera@student.campuscare.edu");
            studentPasswordField.setText("Password123!");
        });
        demoBar.add(demoBtn);

        panel.add(demoBar, BorderLayout.SOUTH);

        return panel;
    }

    private void handleStudentLogin() {
        String email = studentEmailField.getText().trim();
        String pass = new String(studentPasswordField.getPassword());

        if (email.isEmpty() || pass.isEmpty()) {
            JOptionPane.showMessageDialog(this, "Please enter both student email and password.", "Input Required", JOptionPane.WARNING_MESSAGE);
            return;
        }

        try {
            Models.User user = authService.loginStudent(email, pass);
            showStudentDashboard(user);
        } catch (Exception ex) {
            JOptionPane.showMessageDialog(this, ex.getMessage(), "Student Sign In Failed", JOptionPane.ERROR_MESSAGE);
        }
    }

    // -------------------------------------------------------------
    // COUNSELLOR LOGIN
    // -------------------------------------------------------------
    private JPanel createCounsellorLoginPanel() {
        JPanel panel = new JPanel(new BorderLayout(10, 15));
        panel.setBackground(Color.WHITE);
        panel.setBorder(BorderFactory.createEmptyBorder(20, 25, 15, 25));

        JPanel formGrid = new JPanel(new GridLayout(4, 1, 8, 8));
        formGrid.setBackground(Color.WHITE);

        counsellorEmailField = new JTextField("s.bennett@campuscare.edu");
        counsellorPasswordField = new JPasswordField("Password123!");

        formGrid.add(createLabeledField("Counsellor Staff Email:", counsellorEmailField));
        formGrid.add(createLabeledField("Password:", counsellorPasswordField));

        JButton loginBtn = new JButton("Sign In as Counsellor");
        loginBtn.setFont(new Font("SansSerif", Font.BOLD, 14));
        loginBtn.setBackground(new Color(29, 94, 64)); // Dark Green
        loginBtn.setForeground(Color.WHITE);
        loginBtn.setPreferredSize(new Dimension(200, 38));

        loginBtn.addActionListener(e -> handleCounsellorLogin());

        JPanel btnBox = new JPanel(new FlowLayout(FlowLayout.CENTER));
        btnBox.setBackground(Color.WHITE);
        btnBox.add(loginBtn);
        formGrid.add(btnBox);

        panel.add(formGrid, BorderLayout.CENTER);

        // Demo Quick Fill Bar
        JPanel demoBar = new JPanel(new GridLayout(2, 1, 5, 5));
        demoBar.setBackground(new Color(248, 246, 252));
        demoBar.setBorder(BorderFactory.createLineBorder(new Color(230, 225, 240)));

        JPanel row1 = new JPanel(new FlowLayout(FlowLayout.CENTER));
        row1.setBackground(new Color(248, 246, 252));
        JButton demoApprovedBtn = new JButton("Use Approved Staff (Dr. Sarah Bennett)");
        demoApprovedBtn.setFont(new Font("SansSerif", Font.PLAIN, 11));
        demoApprovedBtn.addActionListener(e -> {
            counsellorEmailField.setText("s.bennett@campuscare.edu");
            counsellorPasswordField.setText("Password123!");
        });
        row1.add(demoApprovedBtn);

        JPanel row2 = new JPanel(new FlowLayout(FlowLayout.CENTER));
        row2.setBackground(new Color(248, 246, 252));
        JButton demoPendingBtn = new JButton("Test Unapproved Staff (Elena Rostova - Pending Approval)");
        demoPendingBtn.setFont(new Font("SansSerif", Font.PLAIN, 11));
        demoPendingBtn.setForeground(new Color(180, 83, 9));
        demoPendingBtn.addActionListener(e -> {
            counsellorEmailField.setText("e.rostova@campuscare.edu");
            counsellorPasswordField.setText("Password123!");
        });
        row2.add(demoPendingBtn);

        demoBar.add(row1);
        demoBar.add(row2);

        panel.add(demoBar, BorderLayout.SOUTH);

        return panel;
    }

    private void handleCounsellorLogin() {
        String email = counsellorEmailField.getText().trim();
        String pass = new String(counsellorPasswordField.getPassword());

        if (email.isEmpty() || pass.isEmpty()) {
            JOptionPane.showMessageDialog(this, "Please enter both counsellor email and password.", "Input Required", JOptionPane.WARNING_MESSAGE);
            return;
        }

        try {
            Models.User user = authService.loginCounsellor(email, pass);
            showCounsellorDashboard(user);
        } catch (Exception ex) {
            if (ex.getMessage().contains("pending administrative verification") || ex.getMessage().contains("Active authorization required")) {
                JOptionPane.showMessageDialog(
                    this,
                    "Administrative Approval Required\n\nYour counsellor account is currently pending administrative verification.\nPlease contact the CampusCare System Administrator to activate your clinical credentials.",
                    "Pending Administrative Approval",
                    JOptionPane.WARNING_MESSAGE
                );
            } else {
                JOptionPane.showMessageDialog(this, ex.getMessage(), "Counsellor Sign In Failed", JOptionPane.ERROR_MESSAGE);
            }
        }
    }

    // -------------------------------------------------------------
    // STUDENT REGISTRATION
    // -------------------------------------------------------------
    private JPanel createStudentRegisterPanel() {
        JPanel panel = new JPanel(new BorderLayout(10, 15));
        panel.setBackground(Color.WHITE);
        panel.setBorder(BorderFactory.createEmptyBorder(20, 25, 15, 25));

        JPanel formGrid = new JPanel(new GridLayout(4, 1, 8, 8));
        formGrid.setBackground(Color.WHITE);

        studentRegNameField = new JTextField();
        studentRegEmailField = new JTextField();
        studentRegPasswordField = new JPasswordField();

        formGrid.add(createLabeledField("Full Name:", studentRegNameField));
        formGrid.add(createLabeledField("Campus Student Email:", studentRegEmailField));
        formGrid.add(createLabeledField("Password (min 8 characters):", studentRegPasswordField));

        JButton registerBtn = new JButton("Create Student Account");
        registerBtn.setFont(new Font("SansSerif", Font.BOLD, 13));
        registerBtn.setBackground(new Color(84, 62, 130));
        registerBtn.setForeground(Color.WHITE);

        registerBtn.addActionListener(e -> {
            String name = studentRegNameField.getText().trim();
            String email = studentRegEmailField.getText().trim();
            String pass = new String(studentRegPasswordField.getPassword());

            if (name.isEmpty() || email.isEmpty() || pass.isEmpty()) {
                JOptionPane.showMessageDialog(this, "All fields are required.", "Input Required", JOptionPane.WARNING_MESSAGE);
                return;
            }

            try {
                authService.registerStudent(name, email, pass);
                JOptionPane.showMessageDialog(
                    this,
                    "Student account created successfully!\nYou may now sign in using the 'Student Sign In' tab.",
                    "Registration Successful",
                    JOptionPane.INFORMATION_MESSAGE
                );
                studentEmailField.setText(email);
                studentPasswordField.setText(pass);
                studentRegNameField.setText("");
                studentRegEmailField.setText("");
                studentRegPasswordField.setText("");
            } catch (Exception ex) {
                JOptionPane.showMessageDialog(this, "Registration failed: " + ex.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
            }
        });

        JPanel btnBox = new JPanel(new FlowLayout(FlowLayout.CENTER));
        btnBox.setBackground(Color.WHITE);
        btnBox.add(registerBtn);
        formGrid.add(btnBox);

        panel.add(formGrid, BorderLayout.CENTER);

        JLabel info = new JLabel("Students are activated immediately upon registration.", SwingConstants.CENTER);
        info.setFont(new Font("SansSerif", Font.ITALIC, 11));
        info.setForeground(new Color(29, 94, 64));
        panel.add(info, BorderLayout.SOUTH);

        return panel;
    }

    // -------------------------------------------------------------
    // COUNSELLOR REGISTRATION (PENDING APPROVAL NOTIFICATION)
    // -------------------------------------------------------------
    private JPanel createCounsellorRegisterPanel() {
        JPanel panel = new JPanel(new BorderLayout(10, 15));
        panel.setBackground(Color.WHITE);
        panel.setBorder(BorderFactory.createEmptyBorder(15, 25, 10, 25));

        JPanel formGrid = new JPanel(new GridLayout(5, 1, 6, 6));
        formGrid.setBackground(Color.WHITE);

        counsellorRegNameField = new JTextField();
        counsellorRegEmailField = new JTextField();
        counsellorRegSpecField = new JTextField("Anxiety & Academic Stress");
        counsellorRegPasswordField = new JPasswordField();

        formGrid.add(createLabeledField("Full Name & Title (e.g., Dr. Jane Doe):", counsellorRegNameField));
        formGrid.add(createLabeledField("Institutional Staff Email:", counsellorRegEmailField));
        formGrid.add(createLabeledField("Clinical Specialization:", counsellorRegSpecField));
        formGrid.add(createLabeledField("Password (min 8 characters):", counsellorRegPasswordField));

        JButton registerBtn = new JButton("Submit Counsellor Application");
        registerBtn.setFont(new Font("SansSerif", Font.BOLD, 13));
        registerBtn.setBackground(new Color(29, 94, 64));
        registerBtn.setForeground(Color.WHITE);

        registerBtn.addActionListener(e -> {
            String name = counsellorRegNameField.getText().trim();
            String email = counsellorRegEmailField.getText().trim();
            String spec = counsellorRegSpecField.getText().trim();
            String pass = new String(counsellorRegPasswordField.getPassword());

            if (name.isEmpty() || email.isEmpty() || spec.isEmpty() || pass.isEmpty()) {
                JOptionPane.showMessageDialog(this, "All fields are required.", "Input Required", JOptionPane.WARNING_MESSAGE);
                return;
            }

            try {
                authService.registerCounsellor(name, email, spec, pass);
                JOptionPane.showMessageDialog(
                    this,
                    "Administrative Approval Required\n\nYour counsellor application has been submitted successfully.\nAccount is pending administrative verification before clinical access is granted.",
                    "Counsellor Application Submitted",
                    JOptionPane.INFORMATION_MESSAGE
                );
                counsellorRegNameField.setText("");
                counsellorRegEmailField.setText("");
                counsellorRegPasswordField.setText("");
            } catch (Exception ex) {
                JOptionPane.showMessageDialog(this, "Registration failed: " + ex.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
            }
        });

        JPanel btnBox = new JPanel(new FlowLayout(FlowLayout.CENTER));
        btnBox.setBackground(Color.WHITE);
        btnBox.add(registerBtn);
        formGrid.add(btnBox);

        panel.add(formGrid, BorderLayout.CENTER);

        JLabel info = new JLabel("Notice: All new counsellor accounts require administrative approval before login.", SwingConstants.CENTER);
        info.setFont(new Font("SansSerif", Font.ITALIC, 11));
        info.setForeground(new Color(180, 83, 9));
        panel.add(info, BorderLayout.SOUTH);

        return panel;
    }

    private JPanel createLabeledField(String labelText, JComponent field) {
        JPanel p = new JPanel(new BorderLayout(3, 3));
        p.setBackground(Color.WHITE);
        JLabel lbl = new JLabel(labelText);
        lbl.setFont(new Font("SansSerif", Font.BOLD, 11));
        lbl.setForeground(new Color(83, 75, 98));
        p.add(lbl, BorderLayout.NORTH);
        p.add(field, BorderLayout.CENTER);
        return p;
    }

    // -------------------------------------------------------------
    // MAIN ENTRYPOINT
    // -------------------------------------------------------------
    public static void main(String[] args) {
        // Set FlatLaf Look and Feel for modern aesthetics
        try {
            FlatLightLaf.setup();
        } catch (Exception ignored) {
            try {
                UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
            } catch (Exception e) {
                // Default Swing Look & Feel
            }
        }

        SwingUtilities.invokeLater(() -> {
            MainApp app = new MainApp();
            app.setVisible(true);
        });
    }
}
