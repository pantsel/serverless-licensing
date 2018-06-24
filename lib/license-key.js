/**
 * Created by Administrator on 06/06/2017.
 */

const forge = require('node-forge');
const randomstring = require("randomstring");
const Pack = require('./pack');
const _ = require('lodash');



module.exports = function(options, encryption) {


  var secret = Pack("H*","ec340029d65c7125783d8a8b27b77c8a0fcdc6ff23cf04b576063fd9d1273257");


  var keySize    = 32;
  var profile    = options || {};
  encryption = encryption || "sha1"

  function reverseString(s) {
    return s.split("").reverse().join("");
  }

  function array_chunk (arr, len) {
    return _.map(arr, function(item, index){

      return index % len === 0 ? arr.slice(index, index + len) : null;
    })
      .filter(function(item){ return item;

      });
  }

  return {


    /**
     * Generate a License Key
     * @param serviceId
     * @param keys
     */
    generate : function(serviceId,keys) {

      keys = keys || randomstring.generate(10);

      // Reverse String
      keys = keys.split("").reverse().join("").toUpperCase();


      console.log("generate:secret",secret)

      console.log("generate:keys",keys)

      var profile = {
        app : serviceId,
        keys : keys
      }

      var data = JSON.stringify(profile);


      console.log("generate:data",data)


      var hmac = forge.hmac.create();
      hmac.start(encryption, secret);
      hmac.update(forge.util.encodeUtf8(data));
      hmac = hmac.digest().toHex()

      console.log("generate:hmac",hmac)
      var hmac_array  = hmac.split("")

      var step = Math.floor(hmac_array .length / 15);
      var i = 0;

      var result = [];
      var chunks = array_chunk(keys.split(""),2);
      console.log("generate:chunkcs",chunks)


      chunks.forEach(function(v){
        i = step + i;
        var part = hmac_array[i ++] + v[1] + hmac_array[i ++] + v[0] + hmac_array[i ++];
        console.log("generate:chunks:part",part)
        result.push(part)
        console.log("generate:result so far => ",result)
        i++;

      })


      var key = result.join("-").toUpperCase()
      console.log("Key",key);
      return key;
    },

    /**
     * Validates a gives key's checksum
     */

    checkSum : function(key,serviceId) {

      key = key.trim();
      if(key.length !== 29) return false;

      var keys = key.split("-").map(function(v){
        return v[3] + v[1]
      }).join("");

      // Reverse keys
      keys = keys.split("").reverse().join("");

      console.log("checkSum: old key",key);
      console.log("checkSum:keys",keys)

      return key === this.generate(serviceId,keys);

    }
  }

}