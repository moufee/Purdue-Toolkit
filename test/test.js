'use strict';
const chai = require('chai');
// const should = chai.should();
// const server = require('../bin/www');
const expect = chai.expect;
const assert = require('chai').assert;
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const User = require('../models/user');
const Watch = require('../models/watch');
const Pushover = require('node-pushover');
const config = require('../config');
const push = new Pushover({token: config.get('pushover')});
const mongoose = require('mongoose');
const sender = require('../util/email-sender');
const checker = require('../util/checker');
const format = require('../util/stringFormatter');
mongoose.Promise = require('bluebird');

before(function () {
	mongoose.connect(config.get('db.url'));
});

after(function () {
	mongoose.connection.close();
});

describe('Pushover', function () {
	it('should successfully send a pushover notification', function (done) {
		this.timeout(4000);
		push.send(config.get('testing.pushoverKey'), 'Purdue Toolkit Pushover Testing', 'TESTING!', done);
	});
});

describe('User', function () {

	let testUser = {
		email: config.get('testing.email'),
		password: 'asdffdsa'
	};


	this.timeout(1000);
	it('should be created successfully', function (done) {
		let user = new User(testUser);
		user.save(done);
	});

	it('should be updated successfully', function (done){
		User.findOne({email: testUser.email}, function (err, user) {
			if (err){done(err);}
			assert.equal(user.email, testUser.email);
			user.firstName = 'NewFirstName';
			user.save(function (err, user) {
				if (err) done(err);
				assert.equal(user.firstName, 'NewFirstName');
				done();
			});
		});
	});

	it('should verify password', function (done) {
		User.findOne({email: testUser.email}).select('password').exec(function (err, user) {
			if (err){done(err);}
			expect(user.comparePassword((testUser.password))).to.equal(true);
			done();
		});
	});

	it('should be deleted successfully', function (done){
		User.remove({email: testUser.email}, done);
	});
});

describe('Checker', function () {

	it('should correctly parse a valid class', function (done) {
		checker.getSection(201820, 13032, function (err, section) {
			if (err) done(err);
			expect(section).to.be.an('object');
			expect(section).to.have.property('title');
			expect(section.title).to.be.a('string');
			expect(section.title).to.equal('Operating Systems - 13032 - CS 35400 - LE1');
			expect(section.courseTitle).to.equal('Operating Systems');
			expect(section.sectionNumber).to.equal('LE1');
			expect(section.courseNumber).to.equal('CS 35400');
			done();
		});
	});

	it('should get correct seat numbers', function (done) {
		checker.getSection(201810, 51232, function (err, section) {
			if (err) done(err);
			expect(section).to.be.an('object');
			expect(section).to.have.property('title');
			expect(section.title).to.be.a('string');
			expect(section.title).to.equal('Latin Level I - 51232 - LATN 10100 - 007');
			expect(section.courseTitle).to.equal('Latin Level I');
			expect(section.sectionNumber).to.equal('007');
			expect(section.courseNumber).to.equal('LATN 10100');
			expect(section.totalSeats).to.equal('20');
			expect(section.filledSeats).to.equal('19');
			expect(section.availableSeats).to.equal('1');
			done();
		});
	});

	it('should return an error for an invalid crn', function (done) {
		checker.getSection(201820, 1234567, function (err, section) {
			expect(section).to.be.null;
			expect(err).to.be.an('error');
			expect(err).to.have.property('message');
			expect(err.message).to.equal('An error occurred while attempting to retrieve class information. Make sure the CRN is entered correctly.');
			done();
		});
	});

	it('should return an error for an invalid term', function (done) {
		checker.getSection(123123, 13032, function (err, section) {
			expect(section).to.be.null;
			expect(err).to.be.an('error');
			expect(err).to.have.property('message');
			done();
		});
	});

	it('should format correctly', function () {
		let result = format.watchSuccess({courseTitle: 'testing', courseNumber: 'CS 1234', sectionNumber: '001'});
		expect(result).to.be.a('string');
		expect(result).to.equal('You will be notified when there is space available in <strong>CS 1234: testing, Section 001</strong>');
	});
});

describe('Watch', function () {

	let testWatch = {
		term: '201820',
		crn: '13032',
		email: config.get('testing.email')
	};

	it('should be created without error', function (done) {

		let watch = new Watch(testWatch);
		watch.save().then(watch => {
			expect(watch).to.include(testWatch);
			expect(watch).to.have.property('termFriendly').which.equals('Spring 2018');
			done();});
	});

	it('should be deleted', function () {
		return expect(Watch.remove({email: testWatch.email})).to.be.fulfilled;
	});
});


describe('Email', function () {
	this.timeout(4000);
	it('should send without error', function () {
		return expect(sender.testMail(config.get('testing.email'))).to.be.fulfilled;
	});
});
