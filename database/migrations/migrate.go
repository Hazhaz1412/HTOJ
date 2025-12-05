package migrations

import (
	"HTOJ/database/models"
	"fmt"
	"log"

	"gorm.io/gorm"
)

type Migration struct {
	Version     string
	Description string
	Up          func(*gorm.DB) error
	Down        func(*gorm.DB) error
}

var migrations = []Migration{
	{
		Version:     "001",
		Description: "Create users table",
		Up: func(db *gorm.DB) error {
			return db.AutoMigrate(&models.User{})
		},
		Down: func(db *gorm.DB) error {
			return db.Migrator().DropTable(&models.User{})
		},
	},
}

func Migrate(db *gorm.DB) error {
	// Create migrations table if not exists
	if err := db.AutoMigrate(&MigrationHistory{}); err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	for _, m := range migrations {
		var history MigrationHistory
		err := db.Where("version = ?", m.Version).First(&history).Error

		if err == gorm.ErrRecordNotFound {
			log.Printf("Running migration %s: %s", m.Version, m.Description)

			if err := m.Up(db); err != nil {
				return fmt.Errorf("migration %s failed: %w", m.Version, err)
			}

			history = MigrationHistory{
				Version:     m.Version,
				Description: m.Description,
			}

			if err := db.Create(&history).Error; err != nil {
				return fmt.Errorf("failed to record migration %s: %w", m.Version, err)
			}

			log.Printf("Migration %s completed successfully", m.Version)
		} else if err != nil {
			return fmt.Errorf("failed to check migration status: %w", err)
		} else {
			log.Printf("Migration %s already applied, skipping", m.Version)
		}
	}

	log.Println("All migrations completed successfully")
	return nil
}

func Rollback(db *gorm.DB) error {
	var lastMigration MigrationHistory
	err := db.Order("id desc").First(&lastMigration).Error
	if err == gorm.ErrRecordNotFound {
		log.Println("No migrations to rollback")
		return nil
	} else if err != nil {
		return fmt.Errorf("failed to get last migration: %w", err)
	}

	for _, m := range migrations {
		if m.Version == lastMigration.Version {
			log.Printf("Rolling back migration %s: %s", m.Version, m.Description)

			if err := m.Down(db); err != nil {
				return fmt.Errorf("rollback %s failed: %w", m.Version, err)
			}

			if err := db.Delete(&lastMigration).Error; err != nil {
				return fmt.Errorf("failed to delete migration record: %w", err)
			}

			log.Printf("Migration %s rolled back successfully", m.Version)
			return nil
		}
	}

	return fmt.Errorf("migration version %s not found", lastMigration.Version)
}

type MigrationHistory struct {
	ID          uint   `gorm:"primarykey"`
	Version     string `gorm:"uniqueIndex;not null"`
	Description string `gorm:"not null"`
	AppliedAt   int64  `gorm:"autoCreateTime"`
}

func (MigrationHistory) TableName() string {
	return "migration_history"
}
