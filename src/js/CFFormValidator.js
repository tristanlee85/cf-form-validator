(function (window, $, undefined) {
	var
		// regex for parsing validation routines
		rxpRoutine = /(\!)?([^\[\],]+)(?:\[([^\]]*)\])?/gi,

		// validation URL
		defaultURL = "/remote/remoteValidator.cfm",

		// collection for validation of fields that don't exist
		customValidation = {},

		// errors returned by validation
		errors = [],

		/**
		 * Gets the routine name from the specified validation routine
		 * @param {String} validation
		 * @returns {String} routine
		 */
		getRoutine = function (validation) {
			return rxpRoutine.exec(validation)[2];
		},

		/**
		 * Outputs a warning message to the console (if available)
		 * @param  {String} message
		 * @return {void}
		 */
		warn = function (message) {
			if (console && console.warn) {
				console.warn(message);
			}
		};

	/**
	 * Creates a new form validator
	 * @constructor
	 * @param {String|jQuery|HTMLElement} form the form to be validated
	 * @param {String} [url] the URL to POST to for validation
	 */
	window.CFFormValidator = function (form, url) {
		this.$form = null;

		// set the form if supplied
		if (form) {
			this.setForm(form);
		}

		this.setValidationURL(url || defaultURL);

	};

	$.extend(CFFormValidator.prototype, {

		/**
		 * Sets the form to validate against
		 * @param {String|jQuery|HTMLElement) el
		 * @returns {void}
		 */
		setForm: function (el) {
			var $el = $(el);

			if ($el.length !== 1 || !$el.is("form")) {
				throw "Unable to set form. Argument does not represent a valid FORM element.";
			}

			this.$form = $el;
		},

		/**
		 * Gets the form being validated
		 * @returns {jQuery}
		 */
		getForm: function () {
			return this.$form;
		},

		/**
		 * Sets the URL to be used when POSTing the fields for validation
		 * @param {String} url
		 * @returns {void}
		 */
		setValidationURL: function (url) {
			this.getForm().data("validation-url", url);
		},

		/**
		 * Gets the URL to be used when POSTing the fields for validation
		 * @returns {String}
		 */
		getValidationURL: function () {
			return this.getForm().data("validation-url") || null;
		},

		/**
		 * Validates that the given field is within the form
		 * @param {String|jQuery|HTMLElement) el
		 * @returns {Boolean}
		 */
		isValidField: function (el) {
			var $el = $(el);
			return (
				// ensure the selector exists
				$el.length > 0 &&

				// an array length > 0 must all be the same field
				$el.length === (function () {
					var name,
						$newEl = $el.map(function () {
							var $this = $(this);

							if (!$this.prop("name") || $this.prop("name").length === 0) {
								warn("The specified field must have a name");
								return;
							}

							// 'name' has not been set yet
							if (name === null) {
								name = $(this).prop("name");
							} else if (name !== $(this).prop("name")) {
								warn("The specified field contains elements with different names");
								return;
							}
						});

					return $newEl;
				}()).length &&

				// must be contained within this form
				$($el, this.getForm()) > 0
			);
		},

		/**
		 * Compiles all of the validation details for the form fields
		 * @returns {Object}
		 */
		buildValidation: function () {
			var $form = this.getForm(),

				// get all of the input fields with validation
				$fields = $(":input", this.getForm()).filter(function (idx, el) {
					return !!$(el).data("validation");
				}),

				// validation config
				validationCfg = {};

			// add temporary fields to the collection
			$fields = $fields.add($($.map(customValidation, function(el){return $.makeArray(el);})));

			// iterate all fields and build the validation
			$fields.each(function (idx, el) {
				var $this = $(el),
					name = $this.prop("name"),
					validation = "",
					label = "",
					errorMessages = {},
					routines;

				// if the name isn't present, check for the data reference
				if ($.trim(name).length === 0) {
					name = $this.data("field");
				}

				// if the field name still isn't determined, skip this field
				if ($.trim(name).length === 0) {
					return;
				}

				// if no validation is set on the field, continue to the next
				if ($this.data("validation")) {
					validation = $this.data("validation");
					label = $this.data("label") || $this.prop("name");

					// loop the routines and set any custom error messages
					var routine = rxpRoutine.exec(validation);
					while (routine) {
						// routine[2] is the routine without arguments
						if ($this.data("error-" + routine[2])) {
							errorMessages[routine[2]] = $this.data("error-" + routine[2]);
						}

						routine = rxpRoutine.exec(validation);
					}

					validationCfg[name] = {validation: validation, label: label, errors: errorMessages};
				}
			});

			return validationCfg;
		},

		/**
		 * Adds validation to a field to the validator
		 * @param {String|jQuery|HTMLElement) el Element to add validation to
		 * @param {String|Array|Object} validation List, array, or collection of validation routines
		 * @param {String|Object} errors Error messages for the specific routines
		 * @returns {void}
		 */
		addValidation: function (el, validation, errors) {
			var $el = $(el),
				validations, errorMessages = {}, isNew = false;

			// if the field doesn't exist, create a temporary field
			if (!this.isValidField($el)) {
				// check to see if field is in the temporary collection
				if ($.type(el) === "string" && el in customValidation) {
					$el = customValidation[el];

				// temporary field doesn't exist so create a new one
				} else {
					$el = $("<div>").addClass("temporary");
					isNew = true;
				}
			}

			// existing validation
			validations = ($el.data("validation") || "").split(",");

			// new validation
			if ($.type(validation) === "object") {
				validation = $.map(validation, function (arg, routine) {
					return (routine + (arg ? ("[" + arg + "]") : "")).toString();
				});
			}

			if (!$.isArray(validation)) {
				validation = validation.split(",");
			}

			// append to existing
			$.each(validation, function (idx, val) {
				validations.push(val);
			});

			// set the validation back to the element
			$el.data("validation", validation.join(","));

			// if errors is a string, it must match the length of validation
			if ($.type(errors) === "string" && validation.legnth !== 1) {
				throw "The specified error message cannot be set to multiple routines.";

			// set the error message for the specified routine
			} else if ($.type(errors) === "string") {
				$el.data("error-" + (getRoutine(validation)), errors);

			// set the error messages from the object
			} else if ($.type(errors) === "object") {
				$.each(errors, function (idx, error) {
					$el.data("error-" + (error), errors[error].toString());
				});
			}

			// set this field to the custom routines if it's temporary
			if (isNew) {
				// use the argument as the field's name
				if ($.type(el) === "string") {
					$el.prop("name", el);
					customValidation[el] = $el;

				// field is temporary without a simple name
				} else {
					throw "Unable to add validation for field '" + el.toString() + "'. " +
						  "Unable to create temporary field from the supplied element.";
				}
			}
		},

		/**
		 * Removes the specified validation from the field, including
		 * any custom error messages
		 * @param {String|jQuery|HTMLElement) el Element to add validation to
		 * @param {String|Array} validation List (or array) or validation routines
		 * @returns {void}
		 */
		removeValidation: function (el, validation) {
			var $el = $(el),
				validations,
				i, idxPos, routine;

			// if the field doesn't exist, check the temporary collection
			if (!this.isValidField($el)) {
				// temporary field doesn't exist so exit
				if (!(el in customValidation)) {
					return;

				// temporary field exists
				} else {
					$el = customValidation[el];
				}
			}

			// convert to array
			if (!$.isArray(validation)) {
				validation = validation.split(",");
			}

			// existing validation
			validations = $el.data("validation").split(",");

			// remove validation
			i = validation.length;
			while (i--) {
				routine = getRoutine(validation[i]);
				// remove routine from validation
				idxPos = $.inArray(validations, routine);
				if (idxPos > -1) {
					validations.slice(idxPos, 1);
				}

				// remove custom error message
				$el.data("error" + (routine), null).removeAttr("data-error-" + routine);
			}

			// set the remaining validations back to the element
			$el.data("validation", validations);
		},

		/**
		 * Validates the form by POSTing all fields to the URL and processing the response
		 * @returns {Promise}
		 */
		validate: function () {
			var
				// validation field
				$validation = $("<input>").prop({type: "hidden", name: "validationcfg"}),

				// form data
				$form = this.getForm(),
				data,

				// validation config
				validationCfg = this.buildValidation();

			// append validation config to the form
			$validation.val(JSON.stringify(validationCfg));
			$form.append($validation);

			// serialize form data
			data = $form.serialize();
			$validation.remove();

			// append validation
			$.post(this.getValidationURL(), data);
		},

		/**
		 * Displays any errors messages to the validation error container for the corresponding
		 * field (if it exists)
		 * @return {void}
		 */
		displayErrors: function () {
			var $form = this.getForm(),
				$containers = $(".validation-error", $form),
				i = errors.length,
				filterField = function () {
					return $(this).prop("name") === errors[i].field || $(this).data("field") === errors[i].field;
				};

			// iterate over the errors, locating the error container for the field
			// and set the error message
			while (i--) {
				$containers.filter(filterField).html(errors[i].error);
			}
		},

		/**
		 * Clears the array of errors and all messages on the form
		 * @return {void}
		 */
		clearErrors: function () {
			errors = [];
			$(".validation-error", $form).empty();
		}
	});
}(window, $));