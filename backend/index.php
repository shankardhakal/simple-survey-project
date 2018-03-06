<?php
use \Psr\Http\Message\ServerRequestInterface as Request;
use \Psr\Http\Message\ResponseInterface as Response;
use Medoo\Medoo;

require __DIR__ . '/vendor/autoload.php';

$app = new \Slim\App;


$container = $app->getContainer();

$container['database'] = function () {
    return new Medoo(
        [
            'database_type' => 'mysql',
            'database_name' => 'db_survey',
            'server' => 'localhost',
            'username' => 'un_survey',
            'password' => 'PASSWORD'
        ]
    );
};

$app->get('/questions', function (Request $request, Response $response, array $args) {

    $data = $this->database->select('questions', ['id', 'question']);

    $options = $this->database->select('options', ['id', 'option_name']);


    $userIdentifier = sha1(random_bytes(100));

    $this->database->insert(
        'users',
        ['user_identifier' => $userIdentifier]
    );

    $data = json_encode(["user_id" => $this->database->id(), "questions" => $data, "options" => $options]);

    $body = $response->getBody();
    $body->write($data);

    return $response->withBody($body)
        ->withHeader('Content-type', 'application/json');

});

$app->post('/response', function (Request $request, Response $response, array $args) {

    $requestStr = $request->getBody()->getContents();

    $userResponse = json_decode($requestStr, true);

$res=    $this->database->insert(
        'results',
        $userResponse
    );



    $response->getBody()->write(json_encode(['success'=>true]));

    $response->withHeader('Content-type', 'application/json');

    return $response;

});

$app->get('/result', function (Request $request, Response $response, array $args) {

    $count = $this->database->count('users', 'id');

    $response->withHeader('Content-type', 'application/json');

$fetchResultSql = <<<SQL
SELECT q.question , options.option_name, u.user_identifier
 from options
  INNER JOIN results r ON options.id = r.option_id
  INNER JOIN questions q ON r.question_id = q.id
  INNER JOIN users u ON r.user_id = u.id 
  ORDER by user_identifier
SQL;

    $results = $this->database->query($fetchResultSql)->fetchAll();

 array_walk($results, function (&$array){

    unset($array[0]);

    unset($array[1]);

    unset($array[2]);
});


    $response->getBody()->write(json_encode($results));

    return $response;

});


$app->run();
