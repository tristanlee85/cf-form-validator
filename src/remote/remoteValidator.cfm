<cfscript>
	isACF = listFindNoCase("railo,lucee", server.coldfusion.productname) == 0;

	// variable references
	configField = "validationcfg";
	
	// return object
	result = {
		"success" = true,
		"isValid" = false,
		"errors" = [],
		"message" = ""
	};
	
	try {
		// parse the validation configuration
		config = {};
		if (structKeyExists(form, configField)) {
			try {
				config = deserializeJson(form[configField]);	
			} catch (any e) {
				writedump(form[configField]); abort;
				throw (message = "Unable to deserialize validation configuration. Validation has failed.", type="ValidatorException");
			}
		}
		
		// validation
		oValidator = createObject('#request.assets.cfcs#utils/FormValidator').init(form);
		
		// loop the configuration and set all validation
		for (field in config) {
			oValidator.setValidation(field, config[field].label, config[field].validation);
			
			// custom error messages
			if (structKeyExists(config[field], "errors") && isStruct(config[field].errors)) {
				for (routine in config[field].errors) {
					oValidator.setFieldErrorMessage(field, routine, config[field].errors[routing]);
				}
			}
		}
		
		// validate the form
		result.isValid = oValidator.run(true);
		
		// get the error fields and their messages
		result.errors = oValidator.getErrors();
	
	// custom exception within the validator
	} catch (ValidatorException e) {
		result.message = e.message;
		
	// application exception
	} catch (any e) {
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
</cfscript>