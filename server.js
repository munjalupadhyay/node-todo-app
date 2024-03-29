var express = require('express');
var bodyParser = require('body-parser');
var haversine = require('haversine-distance');

// this is to validate the id in mongo and fetch the data accordingly.
var {ObjectId} = require('mongodb');

var {BoardingPoint} = require('./models/boardingpoint');
var {Route} = require('./models/route');
var {mongoose} = require('./db/mongoose');

var app = express();

app.use(bodyParser.json());

// add new boarding point
app.post('/boardingPoint', (req, res) => {
  console.log("Got post request for " + res);
  var boardingPoint = new BoardingPoint({
    bpId: req.body.bpId,
    bpName: req.body.bpName,
      isActive: req.body.isActive,
      latitude:req.body.latitude,
      longitude: req.body.longitude,
      isHub: req.body.isHub


  })

  boardingPoint.save()
      .then((doc) => {
        res.send(doc);
      }, (error) => {
        res.status(400).send(error);
      });
});


// for <currrentlocation, List<bp>> find the <bp, eta>
// Request:
// {"lattitude":102,"longitude":2,"boardingPoints":[bp1, bp2]}
// Response:
// {"list":[{"bp":bp1,"eta":12},{"bp":bp1,"eta":15}]}

app.post('/findBpEta', (req, res) => {
    console.log("got post request to find ETA for nearby boarding points");
    var lattitude = req.body.lattitude;
    var longitude = req.body.longitude;
    var boardingPoints = req.body.boardingPoints;

    let array = new Array();

    for(let i = 0; i < boardingPoints.length; i++){
        let eta = findEta(lattitude, longitude, boardingPoints[i]);
        array.push({"bp" : boardingPoints[i], "eta" : eta});
    }
    return res.send({"list" : [...array]});;

})

function findEta(lattitude, longitude, boardingPoint) {
    let distance = getDistanceBetweenPointsInMeters(lattitude, longitude, boardingPoint.latitude, boardingPoint.longitude);
    return Math.trunc(distance/80); // returns time in minutes
}

// add new route
app.post('/route', (req, res) => {
  console.log("Got post request for " + res);
  console.log(req.body.route_id,req.body.sourceId,req.body.destinationId,req.body.groupId,req.body.order)
  var route = new Route({
    route_id: req.body.route_id,
    sourceId : req.body.sourceId,
    destinationId : req.body.destinationId,
    groupId : req.body.groupId,
    order : req.body.order
  })

  route.save()
      .then((doc) => {
        res.send(doc);
      }, (error) => {
        console.log(error)
        res.send(400).send(error);
      });
});

app.get('/bpforgivenid', (req, res) => {
console.log("get bp got given id");
let id=req.query.id
BoardingPoint.find().then((bps) => {
for(let i=0;i<bps.length ; i++){
if(bps[i].bpId == id){
res.send(bps[i])
break;
}
}
}, (error) => {
console.log("error occured while fetching boarding point for given id");
res.status(400).send(error);
});
});

// get all the routes
app.get('/routes', (req, res) => {
  console.log("all the routes");
  Route.find().then((routes) => {
    console.log(JSON.stringify(routes))
    res.send({routes})
  }, (error) => {
    console.log("error occured while fetching all the routes");
    res.status(400).send(error);
  });
});

// get all the boarding points
app.get('/boardingpoints', (req, res) => {
  console.log("fetch all the boarding points");
  BoardingPoint.find().then((bps) => {
    console.log(JSON.stringify(bps));
    res.send(bps)
  }, (error) => {
    console.log("error occured in fetching boarding points" + error);
    res.status(400).send(error);
  })
});

app.post('/nearestBP',(req,res)=>{
    var lat1 =req.body.latitude
    var lon1 =req.body.longitude
    var bpArray =new Array();
    BoardingPoint.find().stream()
        .on('data', function(doc){
            console.log(doc)
            var distance=getDistanceBetweenPointsInMeters(lat1,lon1,doc.latitude,doc.longitude)
            if (500>=distance) {
                bpArray.push(doc)
            }

        })
        .on('error', function(err){
            console.log(err)
        })
        .on('end', function(){
            // final callback
            res.send(bpArray)
        });

  // Promise.all([promise1]).then(result=>{
  //
  // });

});
// get all the routes for source and destination
app.get('/getroutes/:source/:destination', (req, res) => {
  console.log("fetching all the routes for the source and destination");
  //todo: considering happy flow for now, validate the data

    let sourceName = req.params.source
    let destinationName = req.params.destination;
    let sourceId = -1;
    let destinationId = -1;

  console.log("source name " + sourceName);
  console.log("destination name " + destinationName);

  let promise1 = BoardingPoint.findOne({bpName: sourceName})
      .then((data) => {
        sourceId = data.bpId;
      }, (error) => {
        console.log(error);
      });
  let promise2 = BoardingPoint.findOne({bpName: destinationName})
      .then((data) => {
          destinationId = data.bpId;
      }, (error) => {
      });

  Promise.all([promise1, promise2]).then(results => {
      console.log(sourceId + "    " + destinationId);
      Route.find({from: sourceId, to: destinationId})
          .then((routes) => {
              res.send({routes});
          }, (error) => {
              console.log("error while fetching route for source : "+ sourceId + " destination: " + destinationId);
              res.status(400).send(error);
          });
  });

});

app.listen(3000, () => {
  console.log('webapp started on port 3000');
});

module.exports = {
  app
}
function getDistanceBetweenPointsInMeters(lat1,lon1,lat2,lon2) {

    var a = { "latitude": lat1, "longitude" : lon1 }
    var b = { "latitude":lat2, "longitude":lon2 }

    return haversine(a,b)
    console.log(haversine(a, b))

}
