<cfsetting showdebugoutput="false" />
<cfscript>
	// include configuration
	include "config.cfm";

	isACF = listFindNoCase("railo,lucee", server.coldfusion.productname) == 0;

	// variable references
	validationField = "validationcfg";
	validation = {};
	
	// return object
	result = {
		"success" = true,
		"isValid" = false,
		"errors" = [],
		"message" = ""
	};
	
	try {
		// parse the validation configuration
		validation = parseValidation();
		
		// validation
		oValidator = setupValidator();
		
		// validate the form
		result.isValid = oValidator.run(true);
		
		// get the error fields and their messages
		result.errors = oValidator.getErrors();
	
	// custom exception within the validator
	} catch (ValidatorException e) {
		result.message = e.message;
	} catch (InvalidComponentException e) {
		result.message = e.message;
			
	// application exception
	} catch (any e) {
		writedump(e); abort;
		result.message = "There was an error validating the form.";
	} finally {
		result.success = len(result.message) == 0;
		
		// clear the buffer and set the header and content to return
		pc = getPageContext();
		
		if (isACF) {
			pc.getCFOutput().clearAll();
		} else {
			pc.getResponse().resetBuffer();
		}
		
		pc.getResponse().setContentType("application/json");
		writeOutput(serializeJson(result));
		abort;
	}
	
	/**
	 * Parse the validation configuration from the FORM
	 * @output false
	 * @return Struct
	 */
	public struct function parseValidation () {
		var validation = {};
		
		if (structKeyExists(form, validationField)) {
			try {
				validation = deserializeJson(form[validationField]);	
			} catch (any e) {
				throw (message = "Unable to deserialize validation configuration. Validation has failed.", type="ValidatorException");
			}
		}
		
		return validation;
	}
	
	/**
	 * Sets up the form validator with the form information and all validation
	 * @output false
	 * @return FormValidator
	 */
	public any function setupValidator () {
		var validator = createObject('#config.componentLocation##config.componentName#');
		
		/*if (!isInstanceOf(validator, "FormValidator")) {
			throw (message="Invalid component specified",
				   detail="Component must be a subclass of FormValidator",
				   type="InvalidComponentException");
		}*/
		
		validator.init(form);
		
		// loop the configuration and set all validation
		for (var field in validation) {
			validator.setValidation(field, validation[field].label, validation[field].validation);
			
			// custom error messages
			if (structKeyExists(validation[field], "errors") && isStruct(validation[field].errors)) {
				for (var routine in validation[field].errors) {
					validator.setFieldErrorMessage(field, routine, validation[field].errors[routine]);
				}
			}
		}
		
		return validator;
	}
</cfscript>