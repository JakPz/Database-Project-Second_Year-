
-- ============================================================
-- FAMS: BUSINESS RULE VALIDATION TRIGGERS
-- MySQL 8+
-- ============================================================

USE fams;

DELIMITER $$

-- ============================================================
-- BR4: POSITION SPECIALIZATION
-- ============================================================

DROP TRIGGER IF EXISTS trg_goalkeeper_type_insert$$

CREATE TRIGGER trg_goalkeeper_type_insert
BEFORE INSERT ON goalkeeper
FOR EACH ROW
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM `position`
        WHERE position_id = NEW.position_id
          AND position_type = 'Goalkeeper'
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Position type must be Goalkeeper';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM outfield_player
        WHERE position_id = NEW.position_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Position cannot have two subtypes';
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_goalkeeper_type_update$$

CREATE TRIGGER trg_goalkeeper_type_update
BEFORE UPDATE ON goalkeeper
FOR EACH ROW
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM `position`
        WHERE position_id = NEW.position_id
          AND position_type = 'Goalkeeper'
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Position type must be Goalkeeper';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM outfield_player
        WHERE position_id = NEW.position_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Position cannot have two subtypes';
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_outfield_type_insert$$

CREATE TRIGGER trg_outfield_type_insert
BEFORE INSERT ON outfield_player
FOR EACH ROW
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM `position`
        WHERE position_id = NEW.position_id
          AND position_type = 'Outfield'
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Position type must be Outfield';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM goalkeeper
        WHERE position_id = NEW.position_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Position cannot have two subtypes';
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_outfield_type_update$$

CREATE TRIGGER trg_outfield_type_update
BEFORE UPDATE ON outfield_player
FOR EACH ROW
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM `position`
        WHERE position_id = NEW.position_id
          AND position_type = 'Outfield'
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Position type must be Outfield';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM goalkeeper
        WHERE position_id = NEW.position_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Position cannot have two subtypes';
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_position_type_update$$

CREATE TRIGGER trg_position_type_update
BEFORE UPDATE ON `position`
FOR EACH ROW
BEGIN
    IF NEW.position_type <> OLD.position_type THEN
        IF EXISTS (
            SELECT 1
            FROM goalkeeper
            WHERE position_id = OLD.position_id
        )
        OR EXISTS (
            SELECT 1
            FROM outfield_player
            WHERE position_id = OLD.position_id
        ) THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Delete old subtype before changing position type';
        END IF;
    END IF;
END$$

-- ============================================================
-- BR6: VALID DATE OF BIRTH
-- ============================================================

DROP TRIGGER IF EXISTS trg_player_dob_insert$$

CREATE TRIGGER trg_player_dob_insert
BEFORE INSERT ON player
FOR EACH ROW
BEGIN
    IF NEW.date_of_birth < '1900-01-01'
       OR NEW.date_of_birth > CURDATE() THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid date of birth';
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_player_dob_update$$

CREATE TRIGGER trg_player_dob_update
BEFORE UPDATE ON player
FOR EACH ROW
BEGIN
    IF NEW.date_of_birth < '1900-01-01'
       OR NEW.date_of_birth > CURDATE() THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid date of birth';
    END IF;
END$$

-- ============================================================
-- BR12 + BR16:
-- GUARDIAN REQUIRED AND AGE ELIGIBILITY
-- ============================================================

DROP TRIGGER IF EXISTS trg_registration_age_insert$$

CREATE TRIGGER trg_registration_age_insert
BEFORE INSERT ON registration
FOR EACH ROW
BEGIN
    DECLARE v_dob DATE DEFAULT NULL;
    DECLARE v_min_age INT DEFAULT NULL;
    DECLARE v_max_age INT DEFAULT NULL;

    IF NOT EXISTS (
        SELECT 1
        FROM parent_player
        WHERE player_id = NEW.player_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Player must have a guardian before registration';
    END IF;

    SELECT date_of_birth
    INTO v_dob
    FROM player
    WHERE player_id = NEW.player_id;

    SELECT ag.min_age, ag.max_age
    INTO v_min_age, v_max_age
    FROM class c
    JOIN age_group ag
      ON ag.age_group_id = c.age_group_id
    WHERE c.class_id = NEW.class_id;

    IF NEW.registration_date < v_dob
       OR v_dob IS NULL
       OR v_min_age IS NULL
       OR v_max_age IS NULL
       OR TIMESTAMPDIFF(
           YEAR,
           v_dob,
           NEW.registration_date
       ) NOT BETWEEN v_min_age AND v_max_age
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Registration age does not fit class age group';
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_registration_age_update$$

CREATE TRIGGER trg_registration_age_update
BEFORE UPDATE ON registration
FOR EACH ROW
BEGIN
    DECLARE v_dob DATE DEFAULT NULL;
    DECLARE v_min_age INT DEFAULT NULL;
    DECLARE v_max_age INT DEFAULT NULL;

    IF NOT EXISTS (
        SELECT 1
        FROM parent_player
        WHERE player_id = NEW.player_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Player must have a guardian before registration';
    END IF;

    SELECT date_of_birth
    INTO v_dob
    FROM player
    WHERE player_id = NEW.player_id;

    SELECT ag.min_age, ag.max_age
    INTO v_min_age, v_max_age
    FROM class c
    JOIN age_group ag
      ON ag.age_group_id = c.age_group_id
    WHERE c.class_id = NEW.class_id;

    IF NEW.registration_date < v_dob
       OR v_dob IS NULL
       OR v_min_age IS NULL
       OR v_max_age IS NULL
       OR TIMESTAMPDIFF(
           YEAR,
           v_dob,
           NEW.registration_date
       ) NOT BETWEEN v_min_age AND v_max_age
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Registration age does not fit class age group';
    END IF;
END$$

-- ============================================================
-- BR20: ATTENDANCE REQUIRES VALID REGISTRATION
-- ============================================================

DROP TRIGGER IF EXISTS trg_attendance_registered_insert$$

CREATE TRIGGER trg_attendance_registered_insert
BEFORE INSERT ON attendance
FOR EACH ROW
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM training_session ts
        JOIN registration r
          ON r.class_id = ts.class_id
         AND r.player_id = NEW.player_id
         AND r.status IN ('Active', 'Completed')
        WHERE ts.session_id = NEW.session_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Attendance requires valid class registration';
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_attendance_registered_update$$

CREATE TRIGGER trg_attendance_registered_update
BEFORE UPDATE ON attendance
FOR EACH ROW
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM training_session ts
        JOIN registration r
          ON r.class_id = ts.class_id
         AND r.player_id = NEW.player_id
         AND r.status IN ('Active', 'Completed')
        WHERE ts.session_id = NEW.session_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Attendance requires valid class registration';
    END IF;
END$$

DELIMITER ;