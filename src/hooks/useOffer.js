import React, { useEffect, useState, useContext } from "react";
import { OfferContractContext } from "context/context";
import {
  useMoralis,
  useMoralisWeb3Api,
  useMoralisWeb3ApiCall,
  useWeb3ExecuteFunction,
} from "react-moralis";

/**
 * Hook: Interface for Offers Contract
 */
export const useOffer = (props) => {
  const token_id = props?.token_id;
  const { Moralis, isInitialized, account } = useMoralis();
  const contractProcessor = useWeb3ExecuteFunction();
  const { contractData } = useContext(OfferContractContext);

  //Offer Data
  const [price, setPrice] = useState();
  const [stock, setStock] = useState();
  const [credit, setCredit] = useState();
  const [creator, setCreator] = useState();
  const [isSeller, setIsSeller] = useState();

  useEffect(() => {
    console.warn("[TEST] useOffer() Fetching Offer on-chain data");
    if (isInitialized && account) loadOfferData(token_id);
  }, [token_id, isInitialized, account]);

  /**
   * Fetch Offer's onChain Data
   */
  const loadOfferData = async (token_id) => {
    getPrice(token_id).then(res => setPrice(res)).catch(err => console.warn("useOffer() Error While Fetching Token's Price: ", { err, token_id }));
    getSupply(token_id).then(res => setStock(res)).catch(err => console.warn("useOffer() Error While Fetching Token's Supply: ", { err, token_id }));
    getCredit(account, token_id).then(res => setCredit(res)).catch(err => console.warn("useOffer() Error While Fetching Credit: ", { err, token_id, account }));
    getCreator(token_id).then(res => {
      console.warn("[TEST] useOffer() Creator: ", res);
      setCreator(res.toLowerCase());
      setIsSeller(res.toLowerCase() === account);
    }).catch(err => console.warn("useOffer() Error While Fetching Creator: ", { err, token_id }));
  };

  /**
   * Save JSON File to IPFS
   * @param {object} jsonFile
   */
  async function saveJSONToIPFS(jsonObject, fileName = "file.json") {
    //Save to IPFS
    const file = new Moralis.File(fileName, { base64: btoa(JSON.stringify(jsonObject)) });
    return file.saveIPFS().then(result => {
      //Return Conventional IPFS URI
      return "ipfs://" + result.hash();
    });
  };

  async function contractCall(options) {
    //Call Function
    // return await Moralis.executeFunction(options)
    //   .catch((error) => {
    //     if (error.code === 4001) console.warn("useOffer.sell() Failed -- User Rejection", { error, options });
    //       else console.error("useOffer.sell() Failed", { error, options });
    //       throw new Error("useOffer.sell() Failed  " + error);
    //   });

    return await contractProcessor.fetch({
      params: options,
      onSuccess: (result) => {
        //Log
        console.log("contractCall() Success", { options, result });
        //Return Transaction result
        return result;
      },
      onError: (error) => {
        if (error.code === 4001) console.warn("contractCall() Failed -- User Rejection", { error, options });
        else console.error("contractCall() Failed", { error, options });
        throw new Error("contractCall() Failed  " + error);
      },
    });
  }

  //-- Writes

  /**
   * Sell (Make a New Offer)
   */
  async function sell(token_price, max_supply, token_uri) {
    //Validate
    if (!contractData) throw new Error("useOffer.sell() Contract Data Missing", { contractData });
    if (!token_price || !max_supply || !token_uri) throw new Error("useOffer.sell() Missing Parameters", { token_price, max_supply, token_uri });
    const options = {
      contractAddress: contractData.hash,
      abi: contractData.abi,
      functionName: "sell",
      params: { token_price, max_supply, token_uri },
    };
    //Run Contract Call
    return contractCall(options);
  } //sell()

  /**
   * buy
   * @param num quantity
   * @param num token_id
   * @param num totalPrice    Payment Amount
   */
  async function buy(token_id, quantity, totalPrice) {
    //Validate
    if (!contractData) throw new Error("useOffer.buy() Contract Data Missing", { contractData });
    if (!quantity || !token_id) throw new Error("useOffer.buy() Missing Parameters", { quantity, token_id });
    const options = {
      contractAddress: contractData.hash,
      abi: contractData.abi,
      functionName: "buy",
      params: { quantity, token_id },
      msgValue: totalPrice,
    };
    console.warn("useOffer.buy() Run W/options:", options);
    //Run Contract Call
    return contractCall(options).catch((error) => {
      if (error.message === "execution reverted: PAYMENT_MISMATCH") {
        console.warn("useOffer.buy() Failed -- Payment Mismatch", { error, options });
      }
      else throw new Error(error);  //Pass Onwards
    });
  } //buy()

  /**
   * order
   * @param num token_id
   */
  async function order(token_id, request_uri) {
    //Validate
    if (!contractData) throw new Error("useOffer.order() Contract Data Missing", { contractData });
    if (!request_uri || !token_id) throw new Error("useOffer.order() Missing Parameters", { request_uri, token_id });
    const options = {
      contractAddress: contractData.hash,
      abi: contractData.abi,
      functionName: "order",
      params: { token_id, request_uri },
    };
    //Run Contract Call
    return contractCall(options).catch((error) => {
      if (error.message === "execution reverted: PAYMENT_MISMATCH") { //TODO: NOT HERE - CHANGE THIS .. NO CREDIT OR SOMETHING
        console.warn("useOffer.order() Failed -- Payment Mismatch", { error, options });
      }
      else throw new Error(error);  //Pass Onwards
    });
  } //order()

  /**
   * Deliver Order
   * @param num token_id
   */
  async function deliver(token_id, order_id, delivery_uri) {
    //Validate
    if (!contractData) throw new Error("useOffer.deliver() Contract Data Missing", { contractData });
    if (!token_id || !order_id || !delivery_uri) throw new Error("useOffer.deliver() Missing Parameters", { token_id, order_id, delivery_uri });
    const options = {
      contractAddress: contractData.hash,
      abi: contractData.abi,
      functionName: "deliver",
      params: { token_id, order_id, delivery_uri },
    };
    //Run Contract Call
    return contractCall(options);
  } //deliver()

  /**
   * Approve Order
   * @param num token_id
   */
  async function approve(token_id, order_id, rating, review_uri) {
    //Validate
    if (!contractData) throw new Error("useOffer.approve() Contract Data Missing", { contractData });
    if (!token_id || !order_id || rating === undefined || !review_uri) throw new Error("useOffer.approve() Missing Parameters", { token_id, order_id, rating, review_uri });
    const options = {
      contractAddress: contractData.hash,
      abi: contractData.abi,
      functionName: "approve",
      params: { token_id, order_id, rating, review_uri },
    };
    //Run Contract Call
    return contractCall(options);
  } //approve()


  //-- Reads 

  /**
   * Get Token Price
   */
  async function getPrice(token_id) {
    const options = {
      contractAddress: contractData.hash,
      abi: contractData.abi,
      functionName: "price",
      params: { token_id },
    };
    return Moralis.executeFunction(options).then((response) => {
      return Number(response?.['_hex']);
    });
  }

  /**
   * Get Token's Available Supply
   */
  async function getSupply(token_id) {
    const options = {
      contractAddress: contractData.hash,
      abi: contractData.abi,
      functionName: "tokenSupplyAvailable",
      params: { token_id },
    };
    return Moralis.executeFunction(options).then((response) => {
      return Number(response?.['_hex']);
    });
  }

  /**
   * Get Creator
   * @param {*} token_id 
   * @returns {string} address
   */
  async function getCreator(token_id) {
    const options = {
      contractAddress: contractData.hash,
      abi: contractData.abi,
      functionName: "_creators",    //TODO: on next version, use 'creator'
      params: { token_id },
    };
    return Moralis.executeFunction(options);  //.then((response) => {
    // return response;
    // });
  }

  /**
   * Get User's Credit
   */
  async function getCredit(account, token_id) {
    const options = {
      contractAddress: contractData.hash,
      abi: contractData.abi,
      functionName: "creditOf",
      params: { account, token_id },
    };
    return Moralis.executeFunction(options).then((response) => {
      // console.warn("[TEST] getCredit() Success", { options, response, Num: Number(response?.['_hex']) });
      return Number(response?.['_hex']);
    });
  }

  return {
    sell, buy, order, deliver, approve, //Offer Actions
    saveJSONToIPFS, //General Functions
    getPrice, getSupply, getCredit, getCreator,  //Offer Getters
    price, stock, credit, creator, isSeller, //Current Offer Parameters
  };
};
