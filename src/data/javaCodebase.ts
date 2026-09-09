export interface JavaFileItem {
  name: string;
  path: string;
  category: 'main' | 'ui' | 'components' | 'models' | 'services' | 'utils';
  content: string;
  description: string;
}

export const JAVA_PROJECT_FILES: JavaFileItem[] = [
  {
    name: 'Main.java',
    path: 'src/Main.java',
    category: 'main',
    description: 'JavaFX Application entry point with responsive window sizing and scene graph mounting.',
    content: `package travelia;

import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.StackPane;
import javafx.stage.Stage;
import travelia.components.Navbar;
import travelia.components.AIButton;
import travelia.ui.*;
import travelia.services.TripService;
import travelia.utils.Theme;

/**
 * TRAVELIA AI - JavaFX Desktop Travel Planner Application
 * Inspired by modern organic design language.
 */
public class Main extends Application {

    private BorderPane rootLayout;
    private StackPane contentArea;
    private Navbar navbar;
    private TripService tripService;
    private AIChatView chatView;

    @Override
    public void start(Stage primaryStage) {
        tripService = new TripService();
        rootLayout = new BorderPane();
        rootLayout.setStyle("-fx-background-color: " + Theme.COLOR_BACKGROUND + ";");

        // Top Navigation Bar
        navbar = new Navbar(this::navigateTo);
        rootLayout.setTop(navbar);

        // Center Content Area (View Switcher)
        contentArea = new StackPane();
        rootLayout.setCenter(contentArea);

        // Floating AI Assistant Button & Chat Panel
        chatView = new AIChatView(tripService);
        AIButton aiButton = new AIButton(e -> chatView.toggleVisibility());
        StackPane rootStack = new StackPane(rootLayout, chatView, aiButton);
        StackPane.setAlignment(aiButton, javafx.geometry.Pos.BOTTOM_RIGHT);
        StackPane.setMargin(aiButton, new javafx.geometry.Insets(0, 32, 32, 0));

        // Initial Screen: Home
        navigateTo("home");

        Scene scene = new Scene(rootStack, 1280, 840);
        primaryStage.setTitle("TRAVELIA AI — Intelligent Travel Planner");
        primaryStage.setScene(scene);
        primaryStage.setMinWidth(1024);
        primaryStage.setMinHeight(720);
        primaryStage.show();
    }

    public void navigateTo(String viewName) {
        contentArea.getChildren().clear();
        navbar.setActiveTab(viewName);

        switch (viewName.toLowerCase()) {
            case "home":
                contentArea.getChildren().add(new HomeView(this::navigateTo, tripService));
                break;
            case "plan trip":
            case "planner":
                contentArea.getChildren().add(new PlannerView(this::onTripGenerated, tripService));
                break;
            case "dashboard":
            case "trip dashboard":
                contentArea.getChildren().add(new TripDashboardView(tripService.getCurrentTrip(), this::navigateTo, tripService));
                break;
            case "discover":
                contentArea.getChildren().add(new DiscoverView(this::navigateTo, tripService));
                break;
            case "my trips":
                contentArea.getChildren().add(new MyTripsView(this::navigateTo, tripService));
                break;
            case "budget":
                contentArea.getChildren().add(new BudgetView(tripService.getCurrentTrip(), tripService));
                break;
            default:
                contentArea.getChildren().add(new HomeView(this::navigateTo, tripService));
        }
    }

    private void onTripGenerated() {
        navigateTo("dashboard");
    }

    public static void main(String[] args) {
        launch(args);
    }
}`
  },
  {
    name: 'Theme.java',
    path: 'src/utils/Theme.java',
    category: 'utils',
    description: 'Design constants, color palette, typography definitions, and card styles.',
    content: `package travelia.utils;

public class Theme {
    // Primary Palette inspired by Reference Design
    public static final String COLOR_PRIMARY = "#344E27";       // Elegant Forest Olive Green
    public static final String COLOR_PRIMARY_HOVER = "#273D1C";
    public static final String COLOR_ACCENT = "#E5ECE0";        // Soft Sage Tint
    public static final String COLOR_BACKGROUND = "#FBFBFB";    // Clean Off-White
    public static final String COLOR_SURFACE = "#FFFFFF";       // Pure Card White
    public static final String COLOR_TEXT_MAIN = "#191919";     // Dark Charcoal Headings
    public static final String COLOR_TEXT_MUTED = "#6B7280";    // Neutral Gray Subtext
    public static final String COLOR_BORDER = "#E5E7EB";        // Thin Divider Gray
    public static final String COLOR_STAR = "#F59E0B";          // Gold Stars

    // Card & UI Styles
    public static final String CARD_STYLE = 
        "-fx-background-color: " + COLOR_SURFACE + ";" +
        "-fx-background-radius: 20px;" +
        "-fx-border-color: " + COLOR_BORDER + ";" +
        "-fx-border-radius: 20px;" +
        "-fx-border-width: 1px;" +
        "-fx-effect: dropshadow(three-pass-box, rgba(0,0,0,0.03), 12, 0, 0, 4);";

    public static final String BUTTON_PRIMARY_STYLE = 
        "-fx-background-color: " + COLOR_PRIMARY + ";" +
        "-fx-text-fill: white;" +
        "-fx-font-weight: bold;" +
        "-fx-background-radius: 9999px;" +
        "-fx-padding: 14px 28px;" +
        "-fx-cursor: hand;";

    public static final String BUTTON_SECONDARY_STYLE = 
        "-fx-background-color: transparent;" +
        "-fx-border-color: " + COLOR_BORDER + ";" +
        "-fx-border-radius: 9999px;" +
        "-fx-border-width: 1px;" +
        "-fx-text-fill: " + COLOR_TEXT_MAIN + ";" +
        "-fx-font-weight: 600;" +
        "-fx-padding: 14px 28px;" +
        "-fx-cursor: hand;";
}`
  },
  {
    name: 'Navbar.java',
    path: 'src/components/Navbar.java',
    category: 'components',
    description: 'Top navigation bar with logo, tabs, notification pill and user avatar.',
    content: `package travelia.components;

import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.Region;
import travelia.utils.Theme;
import java.util.function.Consumer;

public class Navbar extends HBox {

    private Consumer<String> onNavigate;
    private String currentActive = "Home";
    private HBox navLinksBox;

    public Navbar(Consumer<String> onNavigate) {
        this.onNavigate = onNavigate;
        setAlignment(Pos.CENTER_LEFT);
        setPadding(new Insets(18, 48, 18, 48));
        setStyle("-fx-background-color: " + Theme.COLOR_BACKGROUND + "; -fx-border-color: " + Theme.COLOR_BORDER + "; -fx-border-width: 0 0 1 0;");

        // Brand Logo: Sparkle Star + TRAVELIA AI
        Label starIcon = new Label("✦");
        starIcon.setStyle("-fx-text-fill: " + Theme.COLOR_PRIMARY + "; -fx-font-size: 22px; -fx-font-weight: bold;");
        Label logoLabel = new Label("TRAVELIA AI");
        logoLabel.setStyle("-fx-font-size: 18px; -fx-font-weight: 900; -fx-letter-spacing: 1px; -fx-text-fill: " + Theme.COLOR_TEXT_MAIN + ";");
        HBox brand = new HBox(8, starIcon, logoLabel);
        brand.setAlignment(Pos.CENTER_LEFT);
        brand.setOnMouseClicked(e -> onNavigate.accept("Home"));
        brand.setStyle("-fx-cursor: hand;");

        // Navigation Links
        navLinksBox = new HBox(28);
        navLinksBox.setAlignment(Pos.CENTER);
        String[] tabs = {"Home", "Plan Trip", "Discover", "My Trips", "Budget", "About"};
        for (String tab : tabs) {
            Button tabBtn = createTabButton(tab);
            navLinksBox.getChildren().add(tabBtn);
        }

        // Right side items: Bell Notification + Avatar
        Button notifBtn = new Button("🔔");
        notifBtn.setStyle("-fx-background-color: #F3F4F6; -fx-background-radius: 9999px; -fx-padding: 8px 12px; -fx-cursor: hand;");

        Label avatar = new Label("🧑‍🦱");
        avatar.setStyle("-fx-font-size: 20px; -fx-background-color: #E5E7EB; -fx-background-radius: 9999px; -fx-padding: 6px;");

        HBox rightBox = new HBox(16, notifBtn, avatar);
        rightBox.setAlignment(Pos.CENTER_RIGHT);

        Region spacer1 = new Region();
        Region spacer2 = new Region();
        HBox.setHgrow(spacer1, Priority.ALWAYS);
        HBox.setHgrow(spacer2, Priority.ALWAYS);

        getChildren().addAll(brand, spacer1, navLinksBox, spacer2, rightBox);
    }

    private Button createTabButton(String name) {
        Button btn = new Button(name);
        boolean isActive = name.equalsIgnoreCase(currentActive);
        btn.setStyle("-fx-background-color: transparent; -fx-font-size: 14px; -fx-font-weight: " + (isActive ? "bold" : "500") + "; -fx-text-fill: " + (isActive ? Theme.COLOR_TEXT_MAIN : Theme.COLOR_TEXT_MUTED) + "; -fx-cursor: hand;");
        btn.setOnAction(e -> onNavigate.accept(name));
        return btn;
    }

    public void setActiveTab(String name) {
        this.currentActive = name;
        // Refresh styles
        navLinksBox.getChildren().clear();
        String[] tabs = {"Home", "Plan Trip", "Discover", "My Trips", "Budget", "About"};
        for (String tab : tabs) {
            navLinksBox.getChildren().add(createTabButton(tab));
        }
    }
}`
  },
  {
    name: 'HomeView.java',
    path: 'src/ui/HomeView.java',
    category: 'ui',
    description: 'Hero section with organic cutout imagery, typography, and preview cards.',
    content: `package travelia.ui;

import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.ScrollPane;
import javafx.scene.layout.*;
import travelia.services.TripService;
import travelia.utils.Theme;
import java.util.function.Consumer;

public class HomeView extends ScrollPane {

    public HomeView(Consumer<String> onNavigate, TripService tripService) {
        VBox root = new VBox(48);
        root.setPadding(new Insets(40, 64, 60, 64));
        root.setStyle("-fx-background-color: " + Theme.COLOR_BACKGROUND + ";");

        // HERO SECTION (Left Typography + Right Organic Destination Card)
        HBox hero = new HBox(40);
        hero.setAlignment(Pos.CENTER_LEFT);

        // Left Side
        VBox left = new VBox(24);
        left.setPrefWidth(540);

        Label headline = new Label("PLAN YOUR\\nPERFECT TRIP\\nWITH AI");
        headline.setStyle("-fx-font-size: 48px; -fx-font-weight: 900; -fx-text-fill: " + Theme.COLOR_TEXT_MAIN + "; -fx-line-spacing: -6px;");

        Label sub = new Label("Tell us where you want to go. Our AI creates your itinerary, finds stays, discovers experiences, recommends restaurants, and calculates your estimated budget.");
        sub.setWrapText(true);
        sub.setStyle("-fx-font-size: 16px; -fx-text-fill: " + Theme.COLOR_TEXT_MUTED + "; -fx-line-spacing: 4px;");

        HBox btnGroup = new HBox(16);
        Button startBtn = new Button("Start Planning");
        startBtn.setStyle(Theme.BUTTON_PRIMARY_STYLE);
        startBtn.setOnAction(e -> onNavigate.accept("Plan Trip"));

        Button exploreBtn = new Button("Explore Destinations");
        exploreBtn.setStyle(Theme.BUTTON_SECONDARY_STYLE);
        exploreBtn.setOnAction(e -> onNavigate.accept("Discover"));

        btnGroup.getChildren().addAll(startBtn, exploreBtn);
        left.getChildren().addAll(headline, sub, btnGroup);

        // Right Side: Large Organic Image Card with stats
        StackPane rightCard = new StackPane();
        rightCard.setStyle("-fx-background-color: #E2E8F0; -fx-background-radius: 36px; -fx-min-width: 480px; -fx-min-height: 380px; -fx-effect: dropshadow(three-pass-box, rgba(0,0,0,0.06), 24, 0, 0, 8);");
        
        Label tagBadge = new Label("100k+ Happy travelers ★ 4.9/5");
        tagBadge.setStyle("-fx-background-color: white; -fx-background-radius: 9999px; -fx-padding: 8px 18px; -fx-font-weight: bold;");
        StackPane.setAlignment(tagBadge, Pos.BOTTOM_RIGHT);
        StackPane.setMargin(tagBadge, new Insets(0, 24, 24, 0));
        rightCard.getChildren().add(tagBadge);

        hero.getChildren().addAll(left, rightCard);

        // STATS BAR
        HBox statsBar = new HBox(48);
        statsBar.setAlignment(Pos.CENTER);
        statsBar.setPadding(new Insets(24, 32, 24, 32));
        statsBar.setStyle(Theme.CARD_STYLE);

        statsBar.getChildren().addAll(
            createStatItem("10K+", "Trips Planned"),
            createStatItem("500+", "Destinations"),
            createStatItem("4.9/5", "Traveler Rating"),
            createStatItem("₹2.4 Cr", "Budget Saved")
        );

        root.getChildren().addAll(hero, statsBar);
        setContent(root);
        setFitToWidth(true);
        setStyle("-fx-background-color: transparent; -fx-border-width: 0;");
    }

    private VBox createStatItem(String val, String label) {
        VBox box = new VBox(4);
        box.setAlignment(Pos.CENTER);
        Label v = new Label(val);
        v.setStyle("-fx-font-size: 24px; -fx-font-weight: 800; -fx-text-fill: " + Theme.COLOR_TEXT_MAIN + ";");
        Label l = new Label(label);
        l.setStyle("-fx-font-size: 13px; -fx-text-fill: " + Theme.COLOR_TEXT_MUTED + ";");
        box.getChildren().addAll(v, l);
        return box;
    }
}`
  },
  {
    name: 'PlannerView.java',
    path: 'src/ui/PlannerView.java',
    category: 'ui',
    description: 'AI planning card with destination input, dates, preference chips and AI simulation.',
    content: `package travelia.ui;

import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import travelia.services.TripService;
import travelia.utils.Theme;

public class PlannerView extends VBox {

    public PlannerView(Runnable onGenerated, TripService tripService) {
        setSpacing(32);
        setPadding(new Insets(40, 120, 60, 120));
        setAlignment(Pos.TOP_CENTER);
        setStyle("-fx-background-color: " + Theme.COLOR_BACKGROUND + ";");

        // Main AI Planning Card
        VBox card = new VBox(28);
        card.setMaxWidth(800);
        card.setPadding(new Insets(40));
        card.setStyle(Theme.CARD_STYLE);

        Label title = new Label("Where do you want to go?");
        title.setStyle("-fx-font-size: 28px; -fx-font-weight: 800; -fx-text-fill: " + Theme.COLOR_TEXT_MAIN + ";");

        // Destination Input
        TextField destInput = new TextField("Goa, India");
        destInput.setPromptText("Enter destination...");
        destInput.setStyle("-fx-font-size: 16px; -fx-padding: 14px; -fx-background-radius: 12px; -fx-border-color: " + Theme.COLOR_BORDER + "; -fx-border-radius: 12px;");

        // Secondary controls: Dates & Travelers
        HBox options = new HBox(20);
        TextField datesInput = new TextField("Nov 12 - Nov 16, 2026");
        datesInput.setPromptText("Travel dates");
        datesInput.setStyle("-fx-font-size: 14px; -fx-padding: 12px; -fx-background-radius: 10px;");

        ComboBox<String> travelersCombo = new ComboBox<>();
        travelersCombo.getItems().addAll("1 Solo Traveler", "2 Couple Travelers", "4 Family Travelers", "6 Friends Group");
        travelersCombo.setValue("2 Couple Travelers");
        travelersCombo.setStyle("-fx-padding: 6px; -fx-font-size: 14px;");

        options.getChildren().addAll(datesInput, travelersCombo);

        // Preference Chips
        Label prefLabel = new Label("Travel Style & Preferences:");
        prefLabel.setStyle("-fx-font-weight: bold; -fx-text-fill: " + Theme.COLOR_TEXT_MAIN + ";");
        FlowPane chipPane = new FlowPane(12, 12);
        String[] chips = {"Adventure", "Relaxation", "Family", "Couple", "Friends", "Budget", "Luxury", "Food & Culture"};
        for (String c : chips) {
            ToggleButton tb = new ToggleButton(c);
            tb.setStyle("-fx-background-radius: 9999px; -fx-padding: 8px 16px; -fx-cursor: hand;");
            chipPane.getChildren().add(tb);
        }

        // Generate Button
        Button generateBtn = new Button("✨ Generate My Trip");
        generateBtn.setStyle(Theme.BUTTON_PRIMARY_STYLE + "-fx-font-size: 16px; -fx-padding: 16px 36px;");
        generateBtn.setOnAction(e -> {
            generateBtn.setText("⏳ AI Generating Itinerary & Stays...");
            generateBtn.setDisable(true);
            // Simulate AI planning latency with JavaFX timeline or thread
            new Thread(() -> {
                try { Thread.sleep(1200); } catch (Exception ex) {}
                javafx.application.Platform.runLater(onGenerated);
            }).start();
        });

        card.getChildren().addAll(title, destInput, options, prefLabel, chipPane, generateBtn);
        getChildren().add(card);
    }
}`
  },
  {
    name: 'TripService.java',
    path: 'src/services/TripService.java',
    category: 'services',
    description: 'Manages in-memory state, trips, hotels, budget recalculations and AI planner mock.',
    content: `package travelia.services;

import travelia.models.*;
import java.util.ArrayList;
import java.util.List;

public class TripService {

    private Trip currentTrip;
    private List<Trip> savedTrips = new ArrayList<>();

    public TripService() {
        // Initialize with default Goa trip
        currentTrip = new Trip("Goa, India", 5, 4, 2, 38500);
        savedTrips.add(currentTrip);
        savedTrips.add(new Trip("Kerala, India", 7, 6, 2, 52000));
        savedTrips.add(new Trip("Rajasthan, India", 6, 5, 2, 45500));
    }

    public Trip getCurrentTrip() {
        return currentTrip;
    }

    public void setCurrentTrip(Trip trip) {
        this.currentTrip = trip;
    }

    public List<Trip> getSavedTrips() {
        return savedTrips;
    }

    public void saveCurrentTrip() {
        if (!savedTrips.contains(currentTrip)) {
            savedTrips.add(currentTrip);
        }
    }
}`
  },
  {
    name: 'Trip.java',
    path: 'src/models/Trip.java',
    category: 'models',
    description: 'Data model representing a generated trip plan with budget breakdown.',
    content: `package travelia.models;

import java.util.List;

public class Trip {
    private String destination;
    private int days;
    private int nights;
    private int travelers;
    private double totalBudget;

    public Trip(String destination, int days, int nights, int travelers, double totalBudget) {
        this.destination = destination;
        this.days = days;
        this.nights = nights;
        this.travelers = travelers;
        this.totalBudget = totalBudget;
    }

    public String getDestination() { return destination; }
    public int getDays() { return days; }
    public int getNights() { return nights; }
    public int getTravelers() { return travelers; }
    public double getTotalBudget() { return totalBudget; }
    public void setTotalBudget(double b) { this.totalBudget = b; }
}`
  }
];
