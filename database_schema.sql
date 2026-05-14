-- Saint Mary's School Management System - Database Schema
-- Updated: 2026-05-02
-- For use with phpMyAdmin / MySQL

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `id` varchar(128) NOT NULL,
  `name` varchar(255) NOT NULL,
  `grNumber` varchar(50) NOT NULL,
  `fatherName` varchar(255) DEFAULT NULL,
  `motherName` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `age` int(3) DEFAULT NULL,
  `placeOfBirth` varchar(255) DEFAULT NULL,
  `dateOfBirth` date DEFAULT NULL,
  `standard` varchar(50) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `grNumber` (`grNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `teachers`
--

CREATE TABLE `teachers` (
  `id` varchar(128) NOT NULL,
  `name` varchar(255) NOT NULL,
  `age` int(3) DEFAULT NULL,
  `subject` varchar(100) NOT NULL,
  `qrData` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
  `id` varchar(128) NOT NULL,
  `teacherId` varchar(128) NOT NULL,
  `date` date NOT NULL,
  `entryTime` timestamp NULL DEFAULT NULL,
  `exitTime` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `teacherId` (`teacherId`),
  CONSTRAINT `fk_attendance_teacher` FOREIGN KEY (`teacherId`) REFERENCES `teachers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `fees`
--

CREATE TABLE `fees` (
  `id` varchar(128) NOT NULL,
  `studentId` varchar(128) NOT NULL,
  `semester` varchar(50) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `paymentMode` varchar(50) NOT NULL,
  `date` timestamp NOT NULL DEFAULT current_timestamp(),
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `studentId` (`studentId`),
  CONSTRAINT `fk_fees_student` FOREIGN KEY (`studentId`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `results`
--

CREATE TABLE `results` (
  `id` varchar(128) NOT NULL,
  `studentId` varchar(128) NOT NULL,
  `standard` varchar(50) NOT NULL,
  `rollNo` varchar(20) DEFAULT NULL,
  `academicYear` varchar(20) NOT NULL,
  `semester1` JSON DEFAULT NULL,
  `semester2` JSON DEFAULT NULL,
  `attendance_sem1` varchar(50) DEFAULT NULL,
  `attendance_sem2` varchar(50) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  `updatedAt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `studentId` (`studentId`),
  CONSTRAINT `fk_results_student` FOREIGN KEY (`studentId`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `id` varchar(128) NOT NULL,
  `email` varchar(255) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

COMMIT;
