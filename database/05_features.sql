-- Run once after 01_schema.sql and 04_auth.sql; does not drop data.
CREATE TABLE IF NOT EXISTS age_group_recommendation (
 recommendation_id INT AUTO_INCREMENT PRIMARY KEY,
 player_id INT NOT NULL,
 coach_id INT NOT NULL,
 suggested_age_group_id INT NOT NULL,
 reason VARCHAR(500) NOT NULL,
 status ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 reviewed_at TIMESTAMP NULL,
 reviewed_by INT NULL,
 FOREIGN KEY(player_id) REFERENCES player(player_id) ON DELETE CASCADE,
 FOREIGN KEY(coach_id) REFERENCES coach(coach_id),
 FOREIGN KEY(suggested_age_group_id) REFERENCES age_group(age_group_id),
 FOREIGN KEY(reviewed_by) REFERENCES app_user(user_id)
);
