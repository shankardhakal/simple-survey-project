(function ($) {

    var APP = {
        questionResource:"https://shankardhakal.com/index.php/questions",
        responseResource:"https://shankardhakal.com/index.php/response",
        resultResource:"https://shankardhakal.com/index.php/result",
        questions : [], // list of questions for survey
        options:[], // list of options to be used for each questions
        USER_ID:'',
        answers: [] // answer chosen for each questions
    };

    APP.init=function(){
        var self = this;
        this.unAnsweredQuestion = [];
        this.questionSetContainer = $("#surveyQuestions");
        this.resultGraphContainer = $("#surveyGraph");
        this.msgBox = $("#msgBox");
        this.pageLoader = $(".se-pre-con");

        // hide message box
        this.msgBox.hide();
        // hide graph container
        this.resultGraphContainer.hide();
        this.resultGraphContainer.empty();

        this.getSurveyData()
            .done(function (surveyData) {
                console.log(surveyData);
                self.USER_ID = surveyData.user_id;
                self.questions = surveyData.questions;
                self.options = surveyData.options;
                self.renderQuestions();
            })
            .fail(function(){
              console.log("ERROR");
            })
            .always(function(){self.pageLoader.fadeOut('slow');});

        this.resetBtn = $("#resetSurvey");
        this.submitBtn = $("#submitSurvey");

        this.resetBtn.on("click", this.resetSurvey.bind(this));
        this.submitBtn.on("click", this.submitSurveyResponse.bind(this));
    };
   
    APP._disableSubmitBtn = function () {
        this.resetBtn.addClass("disabled");
        this.resetBtn.prop("disabled",true);
    };
    APP._enableSubmitBtn = function () {
        this.resetBtn.removeClass("disabled");
        this.resetBtn.prop("disabled",false);
    };

    APP.resetSurvey = function () {
        this.msgBox.hide();
        this.resultGraphContainer.empty();
       this.unAnsweredQuestion = [];
       this.answers = [];
       this._uncheckAllOptions();
    };

    APP.showMsg = function (type,msg) {
        var MSG_ICONS={
            error:'fa-times-circle',
                info:'fa-info-circle',
                warning:'fa-warning',
            success:'fa-check'
        };

        var icon='<i class="fa '+MSG_ICONS[type]+'"></i>';
        this.msgBox.empty();
        this.msgBox.removeClass();
        this.msgBox.addClass(type+"-msg");
        this.msgBox.html('<p>'+icon+msg+'</p>');
        this.msgBox.show();
    };

    APP._uncheckAllOptions = function () {
        var options = this.questionSetContainer.find('input[type="radio"]');
        for(var i = 0;i<options.length;i++){
            var opt = options[i];
            $(opt).prop("checked",false);
        }
    };

    // gets list of questions as well as options
    APP.getSurveyData = function () {
        return $.ajax({
            url: this.questionResource,
            type:"GET",
            contentType:"application/json"
        });

    };
    // send survey data to the server
    APP.sendSurveyResponse = function (surveyResponse) {
        console.log(surveyResponse);
        return $.ajax({
            url: this.responseResource,
            type:"POST",
            data:JSON.stringify(surveyResponse)
        });
    };

    // get latest result
    APP.getLatestResult = function () {
        return $.ajax({
            url: this.resultResource,
            type:"GET",
            contentType:'application/json'
        });
    };

    APP.processResult = function () {
        var self = this;
      this.getLatestResult()
          .done(function (results) {
              console.log(JSON.parse(results));
            self._processResult(JSON.parse(results));
          })
          .fail(function () {
             console.log("ERROR occurred while retrieving results");
          });
    };
    
    // helper function for processing result after submission
    APP._processResult = function (results) {
        
        var userAnswers = this._groupBy(results,'user_identifier');
        this.totalParticipants = userAnswers.length;
        if(userAnswers.length >= 4){
            var questionGroup = this._groupBy(results,"question");
            this.renderGraph(questionGroup);
        }else{
            this.showMsg("info","There is not enough data to show the graph");
        }
    };
    APP._groupBy = function (coll,prop) {
        var i = 0, val, index,
            values = [], result = [];
        for (; i < coll.length; i++) {
            val = coll[i][prop];
            index = values.indexOf(val);
            if (index > -1)
                result[index].push(coll[i]);
            else {
                values.push(val);
                result.push([coll[i]]);
            }
        }
        return result;
    };

    // submit survey response
    APP.submitSurveyResponse = function () {
        var self = this;

        // prepare for survey
        this.prepareSurveyResponse();

        if(this.unAnsweredQuestion.length > 0){
            // show error message
            var msg=this.buildRequiredQuestionMsg(this.unAnsweredQuestion);

            this.showMsg("error",msg);
        }else{
            // disable submit button
            this._disableSubmitBtn();

            this.sendSurveyResponse(this.answers)
                .done(function(data){
                    console.log(data);
                    // show thank you message
                    self.showMsg("success","Thank you for your participating");

                    // hide question section after two second
                    setTimeout(function () {
                       self.questionSetContainer.parent().hide();
                       // process survey result
                      self.processResult();
                    },2000);

                })
                .fail(function (res) {
                    console.error("some error occurred");
                    console.log(res);
                })
                .always(function () {
                    self._enableSubmitBtn();
                });
        }
    };

    APP.buildRequiredQuestionMsg = function (unansweredQuestions) {
        var msg = "You have not answered question";
        for(var i=0;i<unansweredQuestions.length;i++){
            msg +=" "+unansweredQuestions[i].question_id;
        }
        return msg;
    };
    // renders all survey questions
    APP.renderQuestions = function () {
        var questions = this.questions;
        for(var i= 0; i< questions.length; i++){
            var question = questions[i];
            var qSet = this.buildQuestionSet(question,this.options);
            this.questionSetContainer.append(qSet);
        }
    };

    APP.prepareSurveyResponse = function () {
        var self = this;
        this.unAnsweredQuestion = [];
        var questions = this.questions;
        for(var i= 0; i< questions.length;i++){
            var question = questions[i];

            var ans = $('#q'+question.id+' input:checked').val();
            if(!ans){
                this.unAnsweredQuestion.push({
                    'question_id':question.id
                });
            }else{
                this.answers.push({
                    'user_id':self.USER_ID,
                    'question_id':question.id,
                    'option_id':ans
                });
            }

        }

    };

    // builds jQuery question fieldset element
    APP.buildQuestionSet = function (question,options) {
        var self = this;
        var questionFieldSet =[
            '<fieldset id="q'+question.id+'">',
            '<legend>'+question.id+') '+question.question+'?</legend>',
            '</fieldset>'
        ].join("\n");

        questionFieldSet = $(questionFieldSet);

        options.forEach(function (option) {

            var optElem = self.buildOptionElement(question.id,option);
            questionFieldSet.append(optElem);
        });

        return questionFieldSet;
    };

    // builds option jQuery element
    APP.buildOptionElement = function (questionId,option) {
        var optId = "q"+questionId+"_"+option.option_name;
        var optionElem = [
            '<label for="'+optId+'">',
            '<input type="radio"  value="'+option.id+'" name="q'+questionId+'_ans" id="'+optId+'" required>',
            '<span>'+option.option_name+'</span>',
            '</label>'
        ].join("\n");

        return $(optionElem);
    };

    APP.renderGraph= function (questionGroups) {
        //append title first
        this.resultGraphContainer.append('<h1>Survey Result </h1>');

        for(var i=0;i<questionGroups.length;i++){
            var questionAnswer = questionGroups[i];
            //console.log(this._groupBy(questionAnswer,'option_name'));
            this.buildResponseBar(questionAnswer);
        }

        this.resultGraphContainer.show();
    };
    
    // builds response bar graph for a question responded with each answer options
    APP.buildResponseBar = function (qResponses) {
        var totalResponses = qResponses.length;
        var optResponseGroup = this._groupBy(qResponses,'option_name');
        var yesPercent=0, noPercent=0,maybePercent=0;

        for(var i=0;i<optResponseGroup.length;i++){
            var ansOpts = optResponseGroup[i];
            if(ansOpts[0].option_name =="YES"){
                yesPercent = (ansOpts.length/totalResponses*100).toFixed(0);
            }else if(ansOpts[0].option_name =="NO"){
                noPercent = (ansOpts.length/totalResponses*100).toFixed(0);
            }else if(ansOpts[0].option_name =="MAYBE"){
                maybePercent = (ansOpts.length/totalResponses*100).toFixed(0);
            }
        }

        var qResponseBar = [
            '<h3 class="response-question">'+qResponses[0].question+'</h3>',
            '<div class="graph">',
                '<li class="graph-bar green" style="width:'+yesPercent+'%;" title="'+yesPercent+'%"> <span class="graph-legend">YES</span> </li>',
                '<li class="graph-bar blue" style="width:'+maybePercent+'%;" title="'+maybePercent+'%"> <span class="graph-legend">MAYBE</span> </li>',
                '<li class="graph-bar red" style="width:'+noPercent+'%;" title="'+noPercent+'%"> <span class="graph-legend">NO</span> </li>',
            '</div>'
        ].join("\n");

        this.resultGraphContainer.append(qResponseBar);
    };

    $(document).ready(function () {
        APP.init();
    })

})(jQuery);
